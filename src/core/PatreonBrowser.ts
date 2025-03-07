import type { PageInfo } from "../types/UIConfig";
import PatreonPageAnalyzer from "./PatreonPageAnalyzer";
import { APP_DATA_PATH, PATREON_URL, USER_AGENT } from "./Constants";
import { EventEmitter } from "events";
import type { Browser, Target } from "puppeteer-core";
import puppeteer from "puppeteer-core";
import path from "path";
import fs from "fs";

const SESSION_DATA_PATH = path.join(
  APP_DATA_PATH,
  "/PatreonBrowserSessionData"
);

export default class PatreonBrowser extends EventEmitter {
  #executablePath: string;
  #size: { w: number; h: number };
  #browser: Browser | null;
  #analyzerAbortController: AbortController | null;

  constructor(args: {
    executablePath: string;
    size?: { w?: number; h?: number };
  }) {
    super();
    this.#executablePath = args.executablePath;
    const w = args.size?.w || 800;
    const h = args.size?.h || 845;
    this.#size = { w, h };
    this.#browser = null;
    this.#analyzerAbortController = null;
  }

  async goto(url: string, newPage = false) {
    if (!this.#browser) {
      this.#browser = await this.#launch();
    }
    const pages = await this.#browser.pages();
    const page =
      !newPage && pages.length > 0 ? pages[0] : await this.#browser.newPage();
    page.setUserAgent(USER_AGENT);
    await page.goto(url);
  }

  #ensureSessionDataPath() {
    try {
      if (!fs.existsSync(SESSION_DATA_PATH)) {
        fs.mkdirSync(SESSION_DATA_PATH, { recursive: true });
      }
      return SESSION_DATA_PATH;
    } catch (error: unknown) {
      console.error(
        `Failed to load create browser session data path "${SESSION_DATA_PATH}":`,
        error instanceof Error ? error.message : String(error)
      );
      return undefined;
    }
  }

  async #launch() {
    const browser = await puppeteer.launch({
      headless: false,
      executablePath: this.#executablePath,
      defaultViewport: null,
      userDataDir: this.#ensureSessionDataPath(),
      args: [
        `--window-size=${this.#size.w},${this.#size.h}`,
        "--hide-crash-restore-bubble",
        "--no-sandbox"
      ]
    });

    browser.on("targetchanged", async (t: Target) => {
      const page = await t.page();
      if (!page || !t.url().startsWith(PATREON_URL)) {
        return;
      }
      console.debug(`PatreonBrowser: target changed: ${t.url()}`);
      if (this.#analyzerAbortController) {
        this.#analyzerAbortController.abort();
        this.#analyzerAbortController = null;
      }
      if (page.url() !== t.url()) {
        /**
         * If there is a mismatch between page and target URL, this means Patreon is updating
         * content of page through JS. This also means pageBootstrap will stay the same as before.
         * To be able to analyze page, we need pageBootsrap to be updated too. This can be
         * achieved by reloading the page.
         */
        console.debug(
          "PatreonBrowser: page URL does not match target URL - reload page"
        );
        await page.reload();
      }
      await page.waitForSelector('script[id="__NEXT_DATA__"]');
      try {
        this.#analyzerAbortController = new AbortController();
        console.debug(
          `PatreonBrowser: run PatreonPageAnalyzer on ${page.url()}`
        );
        const analysis = await PatreonPageAnalyzer.analyze(
          page,
          this.#analyzerAbortController.signal
        );
        const cookie = await this.#getCookie(browser);
        console.debug(
          `PatreonBrowser: got the following from page:`,
          JSON.stringify(
            {
              "url (normalized)": analysis?.normalizedURL || null,
              target: analysis?.target?.description || "None identified",
              cookie: cookie
                ? cookie.substring(0, Math.min(cookie.length, 20)) + "..."
                : "None found",
              tiers: analysis?.tiers
                ? analysis.tiers.map((tier) => tier.title).join(", ")
                : "None found"
            },
            null,
            2
          )
        );
        this.emit("browserPageInfo", {
          url: analysis?.normalizedURL || null,
          title: page ? await page.title() : null,
          pageDescription:
            analysis?.target?.description || "No target identified",
          cookie,
          cookieDescription: cookie || "No cookie found",
          tiers: analysis?.tiers || null
        });
      } catch (error: unknown) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
      }
    });

    browser.on("disconnected", () => {
      this.emit("close");
      browser.removeAllListeners();
      this.#browser = null;
    });

    return browser;
  }

  close() {
    if (this.#browser) {
      this.#browser.close();
    }
  }

  isClosed() {
    if (this.#browser) {
      return !this.#browser.connected;
    }
    return true;
  }

  async #getCookie(browser: Browser) {
    return (await browser.cookies())
      .reduce<string[]>((result, c) => {
        if (c.domain === ".patreon.com") {
          result.push(`${c.name}=${c.value}`);
        }
        return result;
      }, [])
      .join("; ");
  }

  emit(eventName: "browserPageInfo", info: PageInfo): boolean;
  emit(eventName: "close"): boolean;
  emit(eventName: string | symbol, ...args: unknown[]): boolean {
    return super.emit(eventName, ...args);
  }

  on(eventName: "browserPageInfo", listener: (info: PageInfo) => void): this;
  on(eventName: "close", listener: () => void): this;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(eventName: string | symbol, listener: (...args: any[]) => void): this {
    return super.on(eventName, listener);
  }

  once(eventName: "browserPageInfo", listener: (info: PageInfo) => void): this;
  once(eventName: "close", listener: () => void): this;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  once(eventName: string | symbol, listener: (...args: any[]) => void): this {
    return super.once(eventName, listener);
  }
}
