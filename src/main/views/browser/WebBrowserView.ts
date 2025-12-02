import { session, WebContentsView } from "electron";
import { PATREON_URL } from "../../Constants";
import type { PatreonPageAnalysis } from "../../PatreonPageAnalyzer";
import PatreonPageAnalyzer from "../../PatreonPageAnalyzer";
import type { PageInfo } from "../../types/UIConfig";
import type { WebBrowserPageNavigatedInfo } from "../../types/MainEvents";
import normalizeUrl from "normalize-url";
import { anonymizeProxy, closeAnonymizedProxy } from "proxy-chain";
import portfinder from "portfinder";
import { PostDownloaderBootstrapData, ProductDownloaderBootstrapData } from "patreon-dl/dist";

export default class WebBrowserView extends WebContentsView {
  static #userAgent: string = "";

  #lastLoadedURL: string | null;
  #analyzePageAbortController: AbortController | null;
  #proxy: {
    url: string;
    anonymizedURL: string;
    rejectUnauthorizedTLS: boolean;
  } | null;

  constructor(partition?: string) {
    super({
      webPreferences: {
        sandbox: true,
        partition
      }
    });
    this.#lastLoadedURL = null;
    this.#analyzePageAbortController = null;
    this.#proxy = null;
    this.#registerListeners();
  }

  static setUserAgent(userAgent: string) {
    this.#userAgent = userAgent;
    session.defaultSession.webRequest.onBeforeSendHeaders(null);
    session.defaultSession.webRequest.onBeforeSendHeaders(
      (details, callback) => {
        details.requestHeaders["User-Agent"] = userAgent;
        callback({ requestHeaders: details.requestHeaders });
      }
    );
  }

  async #loadURL(url: string) {
    await this.webContents.loadURL(url);
  }

  async gotoURL(url: string) {
    try {
      await this.#loadURL(normalizeUrl(url, { defaultProtocol: "https" }));
    } catch (_error) {
      // Do nothing - let errors be shown within the page
    }
  }

  goBack() {
    if (this.webContents.navigationHistory.canGoBack()) {
      this.webContents.navigationHistory.goBack();
    }
  }

  goForward() {
    if (this.webContents.navigationHistory.canGoForward()) {
      this.webContents.navigationHistory.goForward();
    }
  }

  openDevTools() {
    this.webContents.openDevTools();
  }

  closeDevTools() {
    this.webContents.closeDevTools();
  }

  clearSessionData() {
    return this.webContents.session.clearStorageData();
  }

  reload() {
    return this.webContents.reload();
  }

  #registerListeners() {
    this.webContents.on("did-navigate-in-page", async (e, url, isMainFrame) => {
      if (this.#analyzePageAbortController) {
        this.#analyzePageAbortController.abort();
        this.#analyzePageAbortController = null;
      }
      if (!url.startsWith(PATREON_URL)) {
        if (isMainFrame) {
          this.#emitPageNavigatedEvent(url);
          this.#analyzePageAbortController = new AbortController();
          // Sometimes creators have their own domain names, so we also need to check
          // if it is a Patreon-page.
          try {
            if (
              !(await this.#isPatreonPage(
                this.#analyzePageAbortController.signal
              ))
            ) {
              this.#lastLoadedURL = null;
              await this.#emitEmptyPageInfoEvent();
              return;
            }
            console.debug(
              `WebBrowserView: custom domain Patreon page detected: ${url}`
            );
          } catch (error: unknown) {
            if (error instanceof Error && error.name === "AbortError") {
              return;
            }
            console.error(
              `Failed to check if "${url}" is a Patreon page:`,
              error
            );
          } finally {
            this.#analyzePageAbortController = null;
          }
        } else {
          return;
        }
      }
      if (this.#isCloudflareChallengePage(url)) {
        console.debug(
          `WebBrowserView: detected Cloudflare challenge page, skipping analysis`
        );
        this.#lastLoadedURL = null;
        this.#emitPageNavigatedEvent(url);
        await this.#emitEmptyPageInfoEvent();
        return;
      }
      console.debug(`WebBrowserView: target changed: ${url}`);
      if (this.#lastLoadedURL !== null && this.#lastLoadedURL !== url) {
        e.preventDefault();
        this.#lastLoadedURL = url;
        console.debug(
          `WebBrowserView: reloading page to get updated bootstrap data...`
        );
        await this.#loadURL(url);
        return;
      }
      this.#emitPageNavigatedEvent(url);
      this.#analyzePageAbortController = new AbortController();
      try {
        const cookie = await this.#getCookie();
        console.debug(`WebBrowserView: run PatreonPageAnalyzer on "${url}"`);
        const analysis = await this.#analyzePage(
          this.#analyzePageAbortController.signal,
          cookie
        );
        console.debug(
          `WebBrowserView: got the following from page:`,
          JSON.stringify(
            {
              "url (normalized)": analysis?.normalizedURL || null,
              target: analysis?.target?.description || "None identified",
              cookie:
                cookie ?
                  cookie.substring(0, Math.min(cookie.length, 20)) + "..."
                : "None found",
              tiers:
                analysis?.tiers ?
                  analysis.tiers.map((tier) => tier.title).join(", ")
                : "None found"
            },
            null,
            2
          )
        );
        this.#emitPageInfoEvent(analysis, cookie);
      } catch (error: unknown) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        console.error(`Failed to obtain boostrap data from "${url}":`, error);
      } finally {
        this.#lastLoadedURL = url;
        this.#analyzePageAbortController = null;
      }
    });
    this.webContents.on("did-create-window", async (win, details) => {
      if (details.url.startsWith(PATREON_URL)) {
        win.close();
        this.#lastLoadedURL = details.url;
        await this.#loadURL(details.url);
      }
    });
    this.webContents.on(
      "did-fail-load",
      async (e, code, description, url, isMainFrame) => {
        // Ignore code -3 that is thrown occasionally when loading Patreon
        // homepage (when not logged in). This is possibly due to the reloading
        // mechanism in `did-navigate-page`, leading to some scripts
        // trying to send data through closed requests.
        if (!isMainFrame || code === -3) {
          return;
        }
        e.preventDefault();
        const msg = `Failed to load URL "${url}" with error: ${code}${description ? ` ${description.replaceAll("'", '"')}` : ""}`;
        await this.webContents.executeJavaScript(`
        document.clear();
        const msg = '${msg}';
        if (document.body) {
          document.body.innerHTML = '<div style="padding: 5px; font-size: large;">${msg}</div>';
        }
        else {
          alert(msg);
        }
      `);
        this.#emitPageNavigatedEvent(url);
        await this.#emitEmptyPageInfoEvent();
      }
    );
  }

  async #emitEmptyPageInfoEvent() {
    this.#emitPageInfoEvent(
      {
        status: "complete",
        normalizedURL: null,
        target: null,
        tiers: null,
        campaignId: null
      },
      await this.#getCookie()
    );
  }

  async setProxy(url: string, rejectUnauthorizedTLS: boolean) {
    await this.webContents.session.closeAllConnections();
    await this.#closeProxy();
    if (!url.trim()) {
      await this.webContents.session.setProxy({
        proxyRules: ""
      });
      return;
    }
    const anonymizedProxyURL = await anonymizeProxy({
      url,
      port: await portfinder.getPortPromise(),
      ignoreProxyCertificate: !rejectUnauthorizedTLS
    });
    this.#proxy = {
      url,
      anonymizedURL: anonymizedProxyURL,
      rejectUnauthorizedTLS
    };
    await this.webContents.session.setProxy({
      proxyRules: anonymizedProxyURL
    });
    this.webContents.reload();
  }

  async #closeProxy() {
    if (this.#proxy) {
      await closeAnonymizedProxy(this.#proxy.anonymizedURL, true);
      this.#proxy = null;
    }
  }

  #isCloudflareChallengePage(url: string) {
    const qs = new URLSearchParams(new URL(url).search);
    for (const param of qs.keys()) {
      if (param.startsWith("__cf_chl_") || param.startsWith("cf_clearance")) {
        return true;
      }
    }
    return false;
  }

  #isPatreonPage(signal: AbortSignal) {
    return new Promise<boolean>((resolve, reject) => {
      let lastObtainedHTML = "";
      const __setTimer = (rt = 1) =>
        setTimeout(async () => {
          const html = await this.webContents.executeJavaScript(
            "document.body.innerHTML"
          );
          if (signal.aborted) {
            const err = Error("Aborted");
            err.name = "AbortError";
            reject(err);
            return;
          }
          if (lastObtainedHTML !== html) {
            const isPatreonPage = await PatreonPageAnalyzer.isPatreonPage(html);
            if (isPatreonPage) {
              resolve(true);
              return;
            }
            lastObtainedHTML = html;
            __setTimer();
          } else if (rt < 5) {
            __setTimer(rt + 1);
          } else {
            // Page has not changed in approx 1.5s
            resolve(false);
          }
        }, 300);

      __setTimer();
    });
  }

  #emitPageNavigatedEvent(url: string) {
    this.emitWebBrowserViewEvent("pageNavigated", {
      url,
      canGoBack: this.webContents.navigationHistory.canGoBack(),
      canGoForward: this.webContents.navigationHistory.canGoForward()
    });
  }

  #emitPageInfoEvent(
    analysis: PatreonPageAnalysis & { status: "complete" },
    cookie: string
  ) {
    let bootstrapData: PostDownloaderBootstrapData | ProductDownloaderBootstrapData | null = null;
    switch (analysis.target?.type) {
      case 'post': {
        bootstrapData = {
          type: 'post',
          targetURL: analysis.normalizedURL || '',
          postFetch: {
            type: 'single',
            postId: analysis.target.postId
          }
        };
        break;
      }
      case 'postsByUser': {
        bootstrapData = {
          type: 'post',
          targetURL: analysis.normalizedURL || '',
          postFetch: {
            type: 'byUser',
            vanity: analysis.target.vanity,
            campaignId: analysis.campaignId || undefined
          }
        };
        break;
      }
      case 'postsByUserId': {
        bootstrapData = {
          type: 'post',
          targetURL: analysis.normalizedURL || '',
          postFetch: {
            type: 'byUserId',
            userId: analysis.target.userId,
            campaignId: analysis.campaignId || undefined
          }
        };
        break;
      }
      case 'postsByCollection': {
        bootstrapData = {
          type: 'post',
          targetURL: analysis.normalizedURL || '',
          postFetch: {
            type: 'byCollection',
            collectionId: analysis.target.collectionId,
            campaignId: analysis.campaignId || undefined
          }
        };
        break;
      }
      case 'product': {
        bootstrapData = {
          type: 'product',
          targetURL: analysis.normalizedURL || '',
          productFetch: {
            type: 'single',
            productId: analysis.target.productId,
          }
        };
        break;
      }
      case 'shop': {
        bootstrapData = {
          type: 'product',
          targetURL: analysis.normalizedURL || '',
          productFetch: {
            type: 'byShop',
            vanity: analysis.target.vanity,
            campaignId: analysis.campaignId || undefined
          }
        };
        break;
      }
    }

    console.debug('WebBrowserView: bootstrapData:', bootstrapData);

    this.emitWebBrowserViewEvent("pageInfo", {
      url: analysis.normalizedURL || null,
      title: this.webContents.getTitle(),
      pageDescription: analysis.target?.description || "No target identified",
      cookie,
      cookieDescription: cookie || "No cookie found",
      tiers: analysis.tiers || null,
      bootstrapData
    });
  }

  #analyzePage(signal: AbortSignal, cookie: string) {
    return new Promise<PatreonPageAnalysis & { status: "complete" }>(
      (resolve, reject) => {
        let lastObtainedHTML = "";
        const __setTimer = () =>
          setTimeout(async () => {
            const html = await this.webContents.executeJavaScript(
              "document.body.innerHTML"
            );
            if (signal.aborted) {
              const err = Error("Aborted");
              err.name = "AbortError";
              reject(err);
              return;
            }
            if (lastObtainedHTML !== html) {
              const an = await PatreonPageAnalyzer.analyze(html, signal, {
                proxy: this.#proxy,
                userAgent: WebBrowserView.#userAgent,
                cookie
              });
              if (an.status === "complete") {
                resolve(an);
                return;
              }
              lastObtainedHTML = html;
              __setTimer();
            }
          }, 300);

        __setTimer();
      }
    );
  }

  async #getCookie() {
    const cookies = (await this.webContents.session.cookies.get({})).filter(
      (c) =>
        c.domain &&
        (c.domain === "patreon.com" || c.domain.endsWith(".patreon.com"))
    );
    return cookies
      .reduce<string[]>((result, c) => {
        result.push(`${c.name}=${c.value}`);
        return result;
      }, [])
      .join("; ");
  }

  async destroy() {
    this.removeAllListeners();
    await this.#closeProxy();
    await this.webContents.session.closeAllConnections();
    this.webContents.close();
  }

  get proxy() {
    return this.#proxy;
  }

  emitWebBrowserViewEvent(
    event: "pageNavigated",
    info: WebBrowserPageNavigatedInfo
  ): boolean;
  emitWebBrowserViewEvent(event: "pageInfo", info: PageInfo): boolean;
  emitWebBrowserViewEvent(event: string, ...args: unknown[]) {
    return this.emit(event, ...args);
  }

  onWebBrowserViewEvent(
    event: "pageNavigated",
    listener: (info: WebBrowserPageNavigatedInfo) => void
  ): this;
  onWebBrowserViewEvent(
    event: "pageInfo",
    listener: (info: PageInfo) => void
  ): this;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onWebBrowserViewEvent(event: string, listener: (...args: any[]) => void) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.on(event as any, listener);
  }
}
