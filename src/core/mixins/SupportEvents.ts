import { app, dialog, shell } from "electron";
import type { MainProcessConstructor } from "../MainProcess";
import { getHelpContents } from "../util/Help";
import { APP_URL } from "../Constants";
import YouTubeConfigurator from "../util/YouTubeConfigurator";

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
