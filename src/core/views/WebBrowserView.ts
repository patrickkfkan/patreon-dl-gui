import { WebContentsView } from "electron";
import { PATREON_URL, USER_AGENT } from "../Constants";
import type { PatreonPageAnalysis } from "../PatreonPageAnalyzer";
import PatreonPageAnalyzer from "../PatreonPageAnalyzer";
import type { PageInfo } from "../../types/UIConfig";
import type { WebBrowserPageNavigatedInfo } from "../../types/MainEvents";
import normalizeUrl from "normalize-url";
import { anonymizeProxy, closeAnonymizedProxy } from "proxy-chain";
import portfinder from "portfinder";

export default class WebBrowserView extends WebContentsView {
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
    this.webContents.setUserAgent(USER_AGENT);
    this.#registerListeners();
  }

  async gotoURL(url: string) {
    try {
      await this.webContents.loadURL(
        normalizeUrl(url, { defaultProtocol: "https" })
      );
    }
    catch (_error) {
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

  #registerListeners() {
    this.webContents.on("did-navigate-in-page", async (e, url, isMainFrame) => {
      if (this.#analyzePageAbortController) {
        this.#analyzePageAbortController.abort();
        this.#analyzePageAbortController = null;
      }
      if (!url.startsWith(PATREON_URL)) {
        if (isMainFrame) {
          this.#lastLoadedURL = null;
          this.#emitPageNavigatedEvent(url);
          await this.#emitEmptyPageInfoEvent();
        }
        return;
      }
      console.debug(`WebBrowserView: target changed: ${url}`);
      if (this.#lastLoadedURL !== null && this.#lastLoadedURL !== url) {
        e.preventDefault();
        this.#lastLoadedURL = url;
        console.debug(
          `WebBrowserView: reloading page to get updated bootstrap data...`
        );
        await this.webContents.loadURL(url);
        return;
      }
      this.#emitPageNavigatedEvent(url);
      this.#analyzePageAbortController = new AbortController();
      try {
        console.debug(`WebBrowserView: run PatreonPageAnalyzer on "${url}"`);
        const analysis = await this.#analyzePage(
          this.#analyzePageAbortController.signal
        );
        const cookie = await this.#getCookie();
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
      console.log('did-create-window', details);
      if (details.url.startsWith(PATREON_URL)) {
        win.close();
        this.#lastLoadedURL = details.url;
        await this.webContents.loadURL(details.url);
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
        tiers: null
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
    this.emitWebBrowserViewEvent("pageInfo", {
      url: analysis.normalizedURL || null,
      title: this.webContents.getTitle(),
      pageDescription: analysis.target?.description || "No target identified",
      cookie,
      cookieDescription: cookie || "No cookie found",
      tiers: analysis?.tiers || null
    });
  }

  #analyzePage(signal: AbortSignal) {
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
              const an = await PatreonPageAnalyzer.analyze(html, signal);
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
    const cookies = await this.webContents.session.cookies.get({
      domain: ".patreon.com"
    });
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
