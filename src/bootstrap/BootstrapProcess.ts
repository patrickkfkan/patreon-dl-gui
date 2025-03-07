import fs from "fs";
import BootstrapWindow, { BootstrapWindowProps } from "./BootstrapWindow";
import { APP_DATA_PATH } from "../core/Constants";
import ProcessBase from "../ProcessBase";
import { app } from "electron";
import * as PuppeteerBrowsers from "@puppeteer/browsers";
import path from "path";
import { Dependency } from "../types/BootstrapEvents";
import { BootstrapData } from "../types/Bootstrap";

export interface BootstrapProcessInitArgs {
  window?: BootstrapWindowProps;
}

export type BootstrapResult =
  | {
      status: "success";
      data: BootstrapData;
      error?: undefined;
    }
  | {
      status: "aborted";
      data?: undefined;
      error?: undefined;
    }
  | {
      status: "error";
      data?: undefined;
      error: string;
    };

const PUPPETEER_CACHE_DIR = path.resolve(APP_DATA_PATH, "PuppeteerCache");

const BROWSER_DEPENDENCY: Dependency = {
  name: "Chrome browser",
  version: "133.0.6943.141"
};

export default class BootstrapProcess extends ProcessBase<"bootstrap"> {
  protected win: BootstrapWindow;

  #closable: boolean;
  #removeListenerCallbacks: (() => void)[];

  constructor(args: BootstrapProcessInitArgs) {
    super();
    this.win = BootstrapWindow.create(args.window);
    this.#closable = false;
    this.#removeListenerCallbacks = [];
    this.win.on("close", (e: Electron.Event) => {
      if (!this.#closable) {
        e.preventDefault();
      }
    });
  }

  async start(): Promise<BootstrapResult> {
    this.win.launch();
    await new Promise<void>((resolve) => {
      this.#removeListenerCallbacks.push(
        this.on(
          "uiReady",
          () => {
            resolve();
          },
          { once: true }
        )
      );
    });
    const result = await this.#doStart();
    if (result.status !== "error") {
      this.#end();
      return result;
    }
    this.emitRendererEvent(this.win, "bootstrapError", result.error);
    this.#closable = true;
    await new Promise<void>((resolve) => {
      this.#removeListenerCallbacks.push(
        this.on(
          "exit",
          () => {
            resolve();
          },
          { once: true }
        )
      );
      this.win.once("close", () => {
        resolve();
      });
    });
    this.#end();
    return result;
  }

  async #doStart(): Promise<BootstrapResult> {
    console.debug("Bootstrap: checking app data path...");
    // App path
    try {
      if (!fs.existsSync(APP_DATA_PATH)) {
        fs.mkdirSync(APP_DATA_PATH, { recursive: true });
      }
    } catch (error: unknown) {
      return {
        status: "error",
        error: `Failed to create app data path "${APP_DATA_PATH}": ${error instanceof Error ? error.message : JSON.stringify(error)}`
      };
    }

    // Check if browser installed
    console.debug("Bootstrap: checking installed browser...");
    const installedBrowsers = await PuppeteerBrowsers.getInstalledBrowsers({
      cacheDir: PUPPETEER_CACHE_DIR
    });
    if (installedBrowsers.length === 0) {
      this.#closable = true;
      const confirmed = await new Promise<boolean>((resolve) => {
        (async () => {
          this.on(
            "confirmInstallDependencies",
            (result) => {
              resolve(result.confirmed);
            },
            { once: true }
          );
          this.win.once("close", () => {
            resolve(false);
          });
          this.emitRendererEvent(this.win, "promptInstallDependencies", [
            BROWSER_DEPENDENCY
          ]);
        })();
      });
      this.#closable = false;
      if (confirmed) {
        try {
          this.emitRendererEvent(this.win, "installDependencyProgress", {
            dependency: BROWSER_DEPENDENCY,
            status: "downloading",
            downloadProgress: 0
          });
          const browser = await PuppeteerBrowsers.install({
            browser: "chrome" as any,
            cacheDir: PUPPETEER_CACHE_DIR,
            buildId: BROWSER_DEPENDENCY.version,
            unpack: true,
            downloadProgressCallback: (downloadedBytes, totalBytes) => {
              if (downloadedBytes < totalBytes) {
                this.emitRendererEvent(this.win, "installDependencyProgress", {
                  dependency: BROWSER_DEPENDENCY,
                  status: "downloading",
                  downloadProgress: Math.round(
                    (downloadedBytes / totalBytes) * 100
                  )
                });
              } else {
                this.emitRendererEvent(this.win, "installDependencyProgress", {
                  dependency: BROWSER_DEPENDENCY,
                  status: "unpacking"
                });
              }
            }
          });
          console.debug(
            `Bootstrap: ${BROWSER_DEPENDENCY.name} v${BROWSER_DEPENDENCY.version} installed`
          );
          return {
            status: "success",
            data: { browserExecutablePath: browser.executablePath }
          };
        } catch (error: unknown) {
          return {
            status: "error",
            error: `Failed to install ${BROWSER_DEPENDENCY.name}: ${error instanceof Error ? error.message : JSON.stringify(error)}`
          };
        }
      } else {
        return {
          status: "aborted"
        };
      }
    }
    console.debug("Bootstrap: OK");
    return {
      status: "success",
      data: { browserExecutablePath: installedBrowsers[0].executablePath }
    };
  }

  #end() {
    this.#removeListenerCallbacks.forEach((cb) => cb());
    if (!this.win.isDestroyed()) {
      this.win.removeAllListeners();
      this.win.close();
    }
  }
}
