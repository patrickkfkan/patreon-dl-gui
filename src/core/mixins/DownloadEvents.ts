import PatreonDownloader from "patreon-dl";
import { convertUIConfigToPatreonDLOptions } from "../Downloader";
import type { DownloaderBundle, MainProcessConstructor } from "../MainProcess";
import type { Editor } from "../../types/App";
import type { DeepWriteable } from "../../types/Utility";
import ObjectHelper from "../util/ObjectHelper";
import { dialog } from "electron";
import _ from "lodash";

export function DownloadEventSupportMixin<TBase extends MainProcessConstructor>(
  Base: TBase
) {
  return class DownloadEventSupportedProcess extends Base {
    protected registerMainEventListeners() {
      const callbacks = super.registerMainEventListeners();
      return [
        ...callbacks,

        this.handle("startDownload", (editor: Editor) => {
          return new Promise<void>((resolve) => {
            (async () => {
              this.on(
                "downloaderModalClose",
                () => {
                  this.win.hideModalView();
                  resolve();
                },
                { once: true }
              );
              this.win.showModalView();
              try {
                const {
                  targetURL,
                  downloaderOptions,
                  consoleLogger,
                  fileLogger,
                  prompt
                } = convertUIConfigToPatreonDLOptions(editor.config);
                this.downloader = {
                  instance: await PatreonDownloader.getInstance(
                    targetURL,
                    downloaderOptions
                  ),
                  consoleLogger,
                  abortController: new AbortController(),
                  status: "init"
                };
                const dlConfig = this.downloader.instance.getConfig();

                this.emitRendererEvent(this.win.modalView, "downloaderInit", {
                  hasError: false,
                  downloaderConfig: ObjectHelper.clean(
                    this.#getDisplayConfig(dlConfig),
                    {
                      deep: true,
                      cleanNulls: true,
                      cleanEmptyObjects: true
                    }
                  ),
                  fileLoggerConfig: fileLogger.getConfig(),
                  prompt
                });

                this.on(
                  "confirmStartDownload",
                  async (result) => {
                    if (result.confirmed) {
                      await this.#startDownloader();
                    } else {
                      this.downloader = null;
                    }
                  },
                  { once: true }
                );
              } catch (error: unknown) {
                const errMsg =
                  error instanceof Error ? error.message : String(error);
                this.downloader = null;
                this.emitRendererEvent(this.win.modalView, "downloaderInit", {
                  hasError: true,
                  error: `Error: ${errMsg}`
                });
              }
            })();
          });
        }),

        this.handle("abortDownload", () => {
          if (!this.#checkDownloaderExists(this.downloader)) {
            return;
          }
          this.downloader.abortController.abort();
        })
      ];
    }

    #checkDownloaderExists(
      downloader: DownloaderBundle | null
    ): downloader is DownloaderBundle {
      if (!downloader) {
        dialog.showErrorBox("Error", "Downloader instance been destroyed.");
        return false;
      }
      return true;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    #getDisplayConfig(config: ReturnType<PatreonDownloader<any>["getConfig"]>) {
      const displayConfig = _.cloneDeep(config) as DeepWriteable<
        typeof config
      > &
        Record<string, unknown>;
      delete displayConfig.type;
      delete displayConfig.postFetch;
      delete displayConfig.productId;
      if (config.include?.postsPublished?.after) {
        displayConfig.include.postsPublished.after =
          config.include.postsPublished.after.toString();
      }
      if (config.include?.postsPublished?.before) {
        displayConfig.include.postsPublished.before =
          config.include.postsPublished.before.toString();
      }
      return displayConfig;
    }

    async #startDownloader() {
      if (!this.#checkDownloaderExists(this.downloader)) {
        return;
      }
      try {
        this.downloader.consoleLogger.on("message", (message) => {
          this.emitRendererEvent(
            this.win.modalView,
            "downloaderLogMessage",
            message
          );
        });
        this.downloader.status = "running";
        this.emitRendererEvent(this.win.modalView, "downloaderStart");
        await this.downloader.instance.start({
          signal: this.downloader.abortController.signal
        });
        this.downloader.status = "end";
        if (this.downloader.abortController.signal.aborted) {
          this.emitRendererEvent(this.win.modalView, "downloaderEnd", {
            hasError: false,
            aborted: true
          });
          return;
        }
        this.emitRendererEvent(this.win.modalView, "downloaderEnd", {
          hasError: false,
          aborted: false
        });
      } catch (error: unknown) {
        this.downloader.status = "end";
        this.emitRendererEvent(this.win.modalView, "downloaderEnd", {
          hasError: true,
          error: error instanceof Error ? error.message : String(error)
        });
      } finally {
        this.downloader.consoleLogger.removeAllListeners();
        this.downloader = null;
      }
    }
  };
}
