import PatreonDownloader, { isDenoInstalled } from "patreon-dl";
import { convertUIConfigToPatreonDLOptions } from "../Downloader";
import type { DownloaderBundle, MainProcessConstructor } from "../MainProcess";
import type { Editor } from "../types/App";
import ObjectHelper from "../util/ObjectHelper";
import { dialog } from "electron";
import _ from "lodash";

export function DownloadEventSupportMixin<TBase extends MainProcessConstructor>(
  Base: TBase
) {
  return class DownloadEventSupportedProcess extends Base {
    #showDenoMissingWarning = true;

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
                  bootstrapData,
                  downloaderOptions,
                  consoleLogger,
                  fileLogger,
                  prompt
                } = convertUIConfigToPatreonDLOptions(editor.config, {
                  userAgent: this.resolvedUserAgent
                });
                if (bootstrapData) {
                  console.debug("DownloadEvent: instantiating PatreonDownloader with bootstrapData:", bootstrapData);
                }
                else {
                  console.debug("DownloadEvent: bootstrapData not available - instantiating PatreonDownloader with targetURL:", targetURL);
                }
                this.downloader = {
                  instance: await PatreonDownloader.getInstance(
                    bootstrapData || targetURL,
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

                await this.#showDenoMissingWarningDialog(dlConfig);

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const displayConfig = _.cloneDeep(config) as any;
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
      if (config.include?.mediaByFilename) {
        for (const [k, v] of Object.entries(config.include.mediaByFilename)) {
          if (v) {
            if (v.startsWith("!")) {
              const stripped = v.substring(1);
              if (!stripped) {
                delete displayConfig.include.mediaByFilename[k];
              } else {
                displayConfig.include.mediaByFilename[k] = {
                  pattern: v.substring(1),
                  "case-sensitive": false
                };
              }
            } else {
              displayConfig.include.mediaByFilename[k] = {
                pattern: v,
                "case-sensitive": true
              };
            }
          }
        }
      }
      return displayConfig;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async #showDenoMissingWarningDialog(
      config: ReturnType<PatreonDownloader<any>["getConfig"]>
    ) {
      if (!this.#showDenoMissingWarning) {
        return;
      }
      const ytExternalDownloader =
        config.embedDownloaders &&
        config.embedDownloaders.find(
          (downloader) => downloader.provider === "YouTube" && downloader.exec
        );
      if (
        !ytExternalDownloader &&
        !isDenoInstalled(config.pathToDeno || undefined).installed
      ) {
        const result = await dialog.showMessageBox(this.win, {
          type: "warning",
          buttons: ["Got it"],
          checkboxLabel: "Do not show me again for the rest of this session",
          defaultId: 0,
          title: "Warning",
          message: `Deno not found`,
          detail:
            'Deno (https://deno.com) is not found on this system. For embedded YouTube videos, the downloader needs to run code obtained from YouTube / Google servers. Without Deno, such code will be executed without sandboxing. Running un-sandboxed code exposes your system to potential security vulnerabilities, including unauthorized access, data corruption, or malicious operations. If you do have Deno installed, you may specify its path manually in the "Other" tab. Otherwise, procceed at your own discretion.'
        });
        if (result.checkboxChecked) {
          this.#showDenoMissingWarning = false;
        }
      }
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
