import PatreonDownloader, { isDenoInstalled } from "patreon-dl";
import { convertUIConfigToPatreonDLOptions } from "../Downloader";
import type { DownloaderBundle, MainProcessConstructor } from "../MainProcess";
import type { Editor } from "../types/App";
import ObjectHelper from "../util/ObjectHelper";
import { dialog } from "electron";
import _ from "lodash";
import { getErrorString } from "../../common/util/Misc";
import type { DownloaderEndInfo } from "../types/MainEvents";

const ABORT_FALLBACK_TIMEOUT_MS = 10_000;

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
          if (this.downloader && this.downloader.status !== "end") {
            this.win.showModalView();
            return;
          }
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
                  console.debug(
                    "DownloadEvent: instantiating PatreonDownloader with bootstrapData:",
                    bootstrapData
                  );
                } else {
                  console.debug(
                    "DownloadEvent: bootstrapData not available - instantiating PatreonDownloader with targetURL:",
                    targetURL
                  );
                }
                this.downloader = {
                  instance: await PatreonDownloader.getInstance(
                    bootstrapData || targetURL,
                    downloaderOptions
                  ),
                  consoleLogger,
                  abortController: new AbortController(),
                  abortFallbackTimer: null,
                  endNotificationSent: false,
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
                const errMsg = getErrorString(error);
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
          const downloader = this.downloader;
          if (!downloader) {
            return false;
          }
          if (downloader.status === "aborting") {
            return true;
          }
          if (downloader.status !== "running") {
            return false;
          }
          downloader.status = "aborting";
          downloader.abortController.abort();
          downloader.abortFallbackTimer = setTimeout(() => {
            console.warn(
              `Downloader did not stop within ${ABORT_FALLBACK_TIMEOUT_MS}ms after abort`
            );
            this.#notifyDownloaderEnd(downloader, {
              hasError: false,
              aborted: true,
              abortTimedOut: true
            });
          }, ABORT_FALLBACK_TIMEOUT_MS);
          return true;
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
      if (config.include?.productsPublished?.after) {
        displayConfig.include.productsPublished.after =
          config.include.productsPublished.after.toString();
      }
      if (config.include?.productsPublished?.before) {
        displayConfig.include.productsPublished.before =
          config.include.productsPublished.before.toString();
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

    async #showDenoMissingWarningDialog(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      const downloader = this.downloader;
      const onDownloaderEnd = (
        result: Parameters<typeof downloader.instance.emit<"end">>[1]
      ) => {
        if (result.error) {
          this.#notifyDownloaderEnd(downloader, {
            hasError: true,
            error: getErrorString(result.error)
          });
        } else {
          this.#notifyDownloaderEnd(downloader, {
            hasError: false,
            aborted: result.aborted
          });
        }
      };
      try {
        downloader.consoleLogger.on("message", (message) => {
          this.emitRendererEvent(
            this.win.modalView,
            "downloaderLogMessage",
            message
          );
        });
        downloader.instance.once("end", onDownloaderEnd);
        downloader.status = "running";
        this.emitRendererEvent(this.win.modalView, "downloaderStart");
        await downloader.instance.start({
          signal: downloader.abortController.signal
        });
        if (downloader.abortController.signal.aborted) {
          this.#notifyDownloaderEnd(downloader, {
            hasError: false,
            aborted: true
          });
          return;
        }
        this.#notifyDownloaderEnd(downloader, {
          hasError: false,
          aborted: false
        });
      } catch (error: unknown) {
        if (downloader.abortController.signal.aborted) {
          this.#notifyDownloaderEnd(downloader, {
            hasError: false,
            aborted: true
          });
        } else {
          this.#notifyDownloaderEnd(downloader, {
            hasError: true,
            error: getErrorString(error)
          });
        }
      } finally {
        downloader.instance.off("end", onDownloaderEnd);
        if (downloader.abortFallbackTimer) {
          clearTimeout(downloader.abortFallbackTimer);
          downloader.abortFallbackTimer = null;
        }
        downloader.consoleLogger.removeAllListeners();
        if (this.downloader === downloader) {
          this.downloader = null;
        }
      }
    }

    #notifyDownloaderEnd(
      downloader: DownloaderBundle,
      info: DownloaderEndInfo
    ) {
      if (downloader.endNotificationSent) {
        return;
      }
      downloader.endNotificationSent = true;
      downloader.status = "end";
      if (downloader.abortFallbackTimer) {
        clearTimeout(downloader.abortFallbackTimer);
        downloader.abortFallbackTimer = null;
      }
      downloader.consoleLogger.removeAllListeners();
      this.emitRendererEvent(this.win.modalView, "downloaderEnd", info);
    }
  };
}
