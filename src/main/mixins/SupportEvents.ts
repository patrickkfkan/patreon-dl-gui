import { app, dialog, shell } from "electron";
import type { MainProcessConstructor } from "../MainProcess";
import { getHelpContents } from "../util/Help";
import { APP_URL } from "../../common/Constants";
import YouTubeConfigurator from "../util/YouTubeConfigurator";
import {
  getWebBrowseSettings,
  saveWebBrowserSettings
} from "../config/WebBrowserSettings";

export function SupportEventSupportMixin<TBase extends MainProcessConstructor>(
  Base: TBase
) {
  return class SupportEventSupportedProcess extends Base {
    #youtubeConfigurator: YouTubeConfigurator;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(...args: any[]) {
      super(...args);
      this.#youtubeConfigurator = new YouTubeConfigurator();
    }

    protected registerMainEventListeners() {
      const callbacks = super.registerMainEventListeners();
      return [
        ...callbacks,

        this.on("uiReady", () => {
          this.#emitYouTubeConnectionStatusEvent();
        }),

        this.handle("requestHelp", (section, prop) => {
          return new Promise<void>((resolve) => {
            try {
              const contents = getHelpContents(section, prop);

              this.on(
                "helpModalClose",
                () => {
                  this.win.hideModalView();
                  resolve();
                },
                { once: true }
              );

              this.win.showModalView();
              this.emitRendererEvent(this.win.modalView, "requestHelpResult", {
                contents
              });
            } catch (error: unknown) {
              dialog.showErrorBox(
                "Error",
                error instanceof Error ? error.message : String(error)
              );
              this.win.hideModalView();
              resolve();
            }
          });
        }),

        this.handle("requestAboutInfo", () => {
          return new Promise<void>((resolve) => {
            this.on(
              "aboutModalClose",
              () => {
                this.win.hideModalView();
                resolve();
              },
              { once: true }
            );
            this.win.showModalView();
            this.emitRendererEvent(this.win.modalView, "aboutInfo", {
              appName: app.getName(),
              appVersion: app.getVersion(),
              appURL: APP_URL
            });
          });
        }),

        this.handle("openExternalBrowser", (url) => {
          return shell.openExternal(url);
        }),

        this.handle("configureYouTube", () => {
          return new Promise<void>((resolve) => {
            this.on(
              "youtubeConfiguratorModalClose",
              () => {
                this.#cleanupYouTubeConfigurator();
                this.win.hideModalView();
                resolve();
              },
              { once: true }
            );
            this.win.showModalView();
            this.emitRendererEvent(
              this.win.modalView,
              "youtubeConfiguratorStart",
              YouTubeConfigurator.getConnectionStatus()
            );
          });
        }),

        this.handle("startYouTubeConnect", () => {
          this.#cleanupYouTubeConfigurator();
          this.#youtubeConfigurator.on("verificationInfo", (info) => {
            this.emitRendererEvent(
              this.win.modalView,
              "youtubeConnectVerificationInfo",
              info
            );
          });
          this.#youtubeConfigurator.on("end", (result) => {
            this.emitRendererEvent(
              this.win.modalView,
              "youtubeConnectResult",
              result
            );
            this.#emitYouTubeConnectionStatusEvent();
            this.#cleanupYouTubeConfigurator();
          });
          this.#youtubeConfigurator.startConnect();
        }),

        this.handle("cancelYouTubeConnect", () => {
          this.#cleanupYouTubeConfigurator();
        }),

        this.handle("disconnectYouTube", () => {
          this.#youtubeConfigurator.resetConnectionStatus();
          this.#emitYouTubeConnectionStatusEvent();
          this.emitRendererEvent(
            this.win.modalView,
            "youtubeConfiguratorStart",
            YouTubeConfigurator.getConnectionStatus()
          );
        }),

        this.handle("requestWebBrowserSettings", () => {
          return new Promise<void>((resolve) => {
            this.on(
              "webBrowserSettingsModalClose",
              () => {
                this.win.hideModalView();
                resolve();
              },
              { once: true }
            );
            this.win.showModalView();
            this.emitRendererEvent(
              this.win.modalView,
              "webBrowserSettings",
              getWebBrowseSettings()
            );
          });
        }),

        this.handle("saveWebBrowserSettings", async (settings) => {
          try {
            settings.userAgent = settings.userAgent.trim();
            const newUserAgent = settings.userAgent || this.defaultUserAgent;
            const userAgentChanged = newUserAgent !== this.resolvedUserAgent;
            saveWebBrowserSettings(settings);
            if (userAgentChanged) {
              this.resolvedUserAgent = newUserAgent;
              this.win.setUserAgent(newUserAgent);
            }
          } catch (error: unknown) {
            await dialog.showMessageBox(this.win, {
              title: "Error",
              message: `An error occurred while saving settings: ${error instanceof Error ? error.message : String(error)}`,
              buttons: ["OK"]
            });
          }
        }),

        this.handle("clearSessionData", async () => {
          const dialogOpts = {
            title: "Confirm",
            message: `This will clear all cookies and cached data from browser sessions. Confirm?`,
            buttons: ["Cancel", "Proceed"],
            cancelId: 0,
            defaultId: 1
          };
          const result = await dialog.showMessageBox(this.win, dialogOpts);
          if (result.response === dialogOpts.cancelId) {
            return;
          }
          await this.win.clearSessionData(true);
          await dialog.showMessageBox(this.win, {
            title: "",
            message: "Session data have been cleared",
            buttons: ["OK"]
          });
        })
      ];
    }

    #emitYouTubeConnectionStatusEvent() {
      this.emitRendererEvent(
        this.win.editorView,
        "youtubeConnectionStatus",
        YouTubeConfigurator.getConnectionStatus()
      );
    }

    #cleanupYouTubeConfigurator() {
      this.#youtubeConfigurator.removeAllListeners();
      this.#youtubeConfigurator.endConnect();
    }
  };
}
