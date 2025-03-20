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

        this.on("startDownload", async (editor: Editor) => {
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
            const displayConfig = _.cloneDeep(dlConfig) as DeepWriteable<
              typeof dlConfig
            > &
              Record<string, unknown>;
            delete displayConfig.type;
            delete displayConfig.postFetch;
            delete displayConfig.productId;
            if (dlConfig.include?.postsPublished?.after) {
              displayConfig.include.postsPublished.after =
                dlConfig.include.postsPublished.after.toString();
            }
            if (dlConfig.include?.postsPublished?.before) {
              displayConfig.include.postsPublished.before =
                dlConfig.include.postsPublished.before.toString();
            }

            this.emitRendererEvent(this.win.modalView, "downloaderInit", {
              hasError: false,
              downloaderConfig: ObjectHelper.clean(displayConfig, {
                deep: true,
                cleanNulls: true,
                cleanEmptyObjects: true
              }),
              fileLoggerConfig: fileLogger.getConfig(),
              prompt
            });
          } catch (error: unknown) {
            const errMsg =
              error instanceof Error ? error.message : String(error);
            this.downloader = null;
            this.emitRendererEvent(this.win.modalView, "downloaderInit", {
              hasError: true,
              error: `Error: ${errMsg}`
            });
          }
        }),

        this.on("promptStartDownloadResult", async (result) => {
          if (!this.#checkDownloaderExists(this.downloader)) {
            return;
          }
          if (result.confirmed) {
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
        }),

        this.on("abortDownload", () => {
          if (!this.#checkDownloaderExists(this.downloader)) {
            return;
          }
          this.downloader.abortController.abort();
        }),

        this.on("endDownloadProcess", () => {
          this.win.hideModalView();
          this.emitRendererEvent(this.win.modalView, "downloadProcessEnd");
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
  };
}
