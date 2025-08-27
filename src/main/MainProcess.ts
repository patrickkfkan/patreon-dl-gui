import MainWindow from "./MainWindow";
import type { Editor } from "./types/App";
import type { UICommand, ExecUICommandParams } from "./types/MainEvents";
import type DownloaderConsoleLogger from "./DownloaderConsoleLogger";
import { dialog, app, BrowserWindow } from "electron";
import type PatreonDownloader from "patreon-dl";
import _ from "lodash";
import type { AppMenuOptions } from "./mixins/AppMenu";
import { AppMenuSupportMixin } from "./mixins/AppMenu";
import { DownloadEventSupportMixin } from "./mixins/DownloadEvents";
import { EditorEventSupportMixin } from "./mixins/EditorEvents";
import { FileEventSupportMixin } from "./mixins/FileEvents";
import { SupportEventSupportMixin } from "./mixins/SupportEvents";
import RecentDocuments from "./util/RecentDocuments";
import { APP_DATA_PATH } from "../common/Constants";
import ProcessBase from "../common/ProcessBase";
import { WebBrowserEventSupportMixin } from "./mixins/WebBrowserEvents";
import { getStartupUIConfig } from "./config/UIConfig";
import parseArgs from "yargs-parser";
import {
  loadLastMainWindowState,
  saveMainWindowState
} from "./util/WindowState";
import { getWebBrowseSettings } from "./config/WebBrowserSettings";
import { ensureAppDataPath } from "../common/util/FS";
import { DEFAULT_MAIN_WINDOW_PROPS } from "./Constants";
import path from "path";
import { download } from "electron-dl";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MainProcessConstructor = new (...args: any[]) => MainProcessBase;

export interface DownloaderBundle {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  instance: PatreonDownloader<any>;
  consoleLogger: DownloaderConsoleLogger;
  abortController: AbortController;
  status: "init" | "running" | "end";
}

export interface MainProcessBaseArgs {
  defaultUserAgent: string;
}

const processArgs = parseArgs(process.argv);

class MainProcessBase extends ProcessBase<"main"> {
  protected win: MainWindow;
  protected activeEditor: Editor | null;
  protected modifiedEditors: Editor[];
  protected downloader: DownloaderBundle | null;
  protected defaultUserAgent: string;
  protected resolvedUserAgent: string;
  #cleanupCallbacks: (() => void)[];
  #lastCreatedEditorId = 0;

  constructor(args: MainProcessBaseArgs) {
    super();
    const devTools = Reflect.has(processArgs, "dev-tools");
    const lastWindowState = loadLastMainWindowState();
    this.resolvedUserAgent =
      getWebBrowseSettings().userAgent.trim() || args.defaultUserAgent;
    this.win = new MainWindow({
      devTools,
      ...lastWindowState,
      webBrowserViewInitialURL:
        DEFAULT_MAIN_WINDOW_PROPS.webBrowserViewInitialURL,
      webBrowserViewUserAgent: this.resolvedUserAgent
    });
    this.activeEditor = null;
    this.modifiedEditors = [];
    this.downloader = null;
    this.defaultUserAgent = args.defaultUserAgent;
    this.#cleanupCallbacks = [];
  }

  protected setAppMenu(_options?: AppMenuOptions) {
    // To be fulfilled by AppMenuSupportMixin
  }

  protected registerMainEventListeners() {
    return [
      this.on("uiReady", async () => {
        await this.createEditor(null, (editor) => {
          this.emitRendererEvent(this.win.editorView, "editorCreated", editor);
        });
        this.emitRendererEvent(this.win.editorView, "recentDocumentsInfo", {
          entries: RecentDocuments.list()
        });
      }),
      this.handle("downloadExternal", async ({ url, creatorName }: { url: string; creatorName: string; }) => {
        const win = this.win;
        const downloadPath = path.join(APP_DATA_PATH, "downloads", creatorName);
        await download(win as unknown as BrowserWindow, url, {
          directory: downloadPath,
          onStarted: (item: any) => {
            this.win.editorView.webContents.send("download-progress", {
              percent: item.getReceivedBytes() / item.getTotalBytes(),
              totalBytes: item.getTotalBytes(),
              receivedBytes: item.getReceivedBytes()
            });
          },
          onProgress: (progress: any) => {
            this.win.editorView.webContents.send("download-progress", {
              percent: progress.percent,
              totalBytes: progress.totalBytes,
              receivedBytes: progress.transferredBytes
            });
          },
          onCompleted: (file: any) => {
            this.win.editorView.webContents.send("download-complete", file);
          }
        });
      })
      // More to be added by mixins
    ];
  }

  async start() {
    ensureAppDataPath();
    this.setAppMenu();
    this.win.on("close", (e) => {
      this.end(e);
    });

    this.#cleanupCallbacks.push(
      ...this.registerMainEventListeners(),
      this.handle("getEditorPanelWidth", () => {
        return this.win.getStateInfo().editorPanelWidth;
      })
    );

    this.win.onMainWindowEvent("stateChange", (info) => {
      saveMainWindowState(info);
    });

    this.win.onWebBrowserViewEvent("pageInfo", (info) => {
      this.emitRendererEvent(this.win.editorView, "browserPageInfo", info);
    });

    this.win.onWebBrowserViewEvent("pageNavigated", (info) => {
      this.emitRendererEvent(this.win.editorView, "browserPageNavigated", info);
    });

    this.win.onWebBrowserViewEvent("applyProxyResult", (result) => {
      this.emitRendererEvent(this.win.editorView, "applyProxyResult", result);
    });

    await this.win.launch();

    console.debug(`Main process started. App data path is "${APP_DATA_PATH}".`);
    console.debug(`Default user agent is "${this.defaultUserAgent}".`);
  }

  protected async createEditor(
    props?: Pick<Editor, "config" | "filePath" | "name" | "loadAlerts"> | null,
    editorCallback?: (editor: Editor) => void
  ) {
    const config = props?.config || null;
    const filePath = props?.filePath || null;
    const name = props?.name || null;
    const editorId = this.#lastCreatedEditorId;
    const editor: Editor = {
      id: editorId,
      name: name || (editorId > 0 ? `Untitled-${editorId}` : "Untitled"),
      filePath: filePath,
      config: config || getStartupUIConfig(),
      modified: false,
      promptOnSave: !!filePath
    };
    if (props?.loadAlerts && props.loadAlerts.length > 0) {
      editor.loadAlerts = props.loadAlerts;
    }
    this.#lastCreatedEditorId++;

    if (editorCallback) {
      editorCallback(editor);
    }

    await this.win.createWebBrowserViewForEditor(editor);

    return editor;
  }

  async end(e?: Electron.Event) {
    e?.preventDefault();
    const confirmed = await new Promise<boolean>((resolve) => {
      (async () => {
        if (this.downloader) {
          if (this.downloader.status === "running") {
            const confirmAbort =
              (
                await dialog.showMessageBox(this.win, {
                  title: "Abort download?",
                  message: `"Download is in progress. Abort download?`,
                  buttons: ["Cancel", "Abort"],
                  cancelId: 0,
                  defaultId: 1
                })
              ).response === 1;
            if (confirmAbort) {
              this.downloader.abortController.abort();
            } else {
              resolve(false);
              return;
            }
          }
        }
        if (this.modifiedEditors.length === 0) {
          resolve(true);
          return;
        }
        const message =
          this.modifiedEditors.length === 1 ?
            `"${this.modifiedEditors[0].name}" has been modified. Discard changes?`
          : `${this.modifiedEditors.length} files have been modified. Discard changes?`;
        const confirmDiscard =
          (
            await dialog.showMessageBox(this.win, {
              title: "Dischard unsaved changes?",
              message,
              buttons: ["Cancel", "Discard"],
              cancelId: 0,
              defaultId: 1
            })
          ).response === 1;
        if (!confirmDiscard) {
          resolve(false);
          return;
        }
        resolve(true);
      })();
    });
    if (confirmed) {
      this.#cleanupCallbacks.forEach((cb) => cb());
      this.#cleanupCallbacks = [];
      const webBrowserSettings = getWebBrowseSettings();
      if (webBrowserSettings.clearSessionDataOnExit) {
        await this.win.clearSessionData();
      }
      await this.win.destroy();
      return;
    }
  }

  execUICommand<C extends UICommand>(
    command: C,
    ...params: ExecUICommandParams<C>
  ) {
    this.emitRendererEvent(
      this.win.editorView,
      "execUICommand",
      command,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(params as [any])
    );
  }
}

const MainProcess = WebBrowserEventSupportMixin(
  SupportEventSupportMixin(
    DownloadEventSupportMixin(
      EditorEventSupportMixin(
        FileEventSupportMixin(AppMenuSupportMixin(MainProcessBase))
      )
    )
  )
);

export default MainProcess;
