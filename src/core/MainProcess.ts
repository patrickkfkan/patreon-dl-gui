import MainWindow, { type MainWindowProps } from "./MainWindow";
import PatreonBrowser from "./PatreonBrowser";
import type { Editor } from "../types/App";
import type {
  RendererEvent,
  MainEvent,
  UICommand,
  RendererEventListener,
  MainEventListener,
  ExecUICommandParams
} from "../types/Events";
import type DownloaderConsoleLogger from "./DownloaderConsoleLogger";
import type { BrowserWindow, IpcMainEvent } from "electron";
import { dialog, ipcMain } from "electron";
import type PatreonDownloader from "patreon-dl";
import fs from "fs";
import _ from "lodash";
import type { AppMenuOptions } from "./mixins/AppMenu";
import { AppMenuSupportMixin } from "./mixins/AppMenu";
import { createEditor } from "./util/Editor";
import { DownloadEventSupportMixin } from "./mixins/DownloadEvents";
import { EditorEventSupportMixin } from "./mixins/EditorEvents";
import { FileEventSupportMixin } from "./mixins/FileEvents";
import { SupportEventSupportMixin } from "./mixins/SupportEvents";
import RecentDocuments from "./util/RecentDocuments";
import { APP_DATA_PATH } from "./Constants";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MainProcessConstructor = new (...args: any[]) => MainProcessBase;

export interface MainProcessInitArgs {
  mainWindow?: MainWindowProps;
  patreonURL?: URL;
}

export interface DownloaderBundle {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  instance: PatreonDownloader<any>;
  consoleLogger: DownloaderConsoleLogger;
  abortController: AbortController;
  status: "init" | "running" | "end";
}

class MainProcessBase {
  protected win: MainWindow;
  protected browser: PatreonBrowser;
  protected activeEditor: Editor | null;
  protected modifiedEditors: Editor[];
  protected downloader: DownloaderBundle | null;
  #initialURL: URL;
  #removeListenerCallbacks: (() => void)[];

  constructor(args: MainProcessInitArgs) {
    this.win = MainWindow.create(args?.mainWindow);
    this.browser = this.#createPatreonBrowser();
    this.activeEditor = null;
    this.modifiedEditors = [];
    this.downloader = null;
    this.#initialURL = args?.patreonURL || new URL("https://www.patreon.com");
    this.#removeListenerCallbacks = [];
  }

  #createPatreonBrowser() {
    const browser = new PatreonBrowser();
    browser.on("browserPageInfo", (info) => {
      this.emitRendererEvent(this.win, "browserPageInfo", info);
    });
    browser.on("close", () => {
      this.end();
    });
    return browser;
  }

  protected setAppMenu(_options?: AppMenuOptions) {
    // To be fulfilled by AppMenuSupportMixin
  }

  protected registerMainEventListeners() {
    return [
      this.on("uiReady", () => {
        this.emitRendererEvent(this.win, "editorCreated", createEditor());
        this.emitRendererEvent(this.win, "recentDocumentsInfo", {
          entries: RecentDocuments.list()
        });
      })
      // More to be added by mixins
    ];
  }

  async start() {
    this.setAppMenu();
    this.win.on("close", (e) => {
      this.end(e);
    });

    try {
      if (!fs.existsSync(APP_DATA_PATH)) {
        fs.mkdirSync(APP_DATA_PATH, { recursive: true });
      }
    } catch (error: unknown) {
      console.error(
        `Failed to create app data path "${APP_DATA_PATH}":`,
        error instanceof Error ? error.message : String(error)
      );
    }

    this.#removeListenerCallbacks.push(...this.registerMainEventListeners());

    await this.win.launch();
    await this.browser.goto(this.#initialURL.toString());

    console.debug(`Main process started. App data path is "${APP_DATA_PATH}".`);
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
          this.modifiedEditors.length === 1
            ? `"${this.modifiedEditors[0].name}" has been modified. Discard changes?`
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
      this.#removeListenerCallbacks.forEach((cb) => cb());
      this.#removeListenerCallbacks = [];
      this.browser.removeAllListeners();
      this.browser.close();
      this.win.removeAllListeners();
      this.win.close();
      return;
    }

    if (this.browser.isClosed()) {
      this.browser = this.#createPatreonBrowser();
      let url = this.#initialURL.toString();
      const target = this.activeEditor?.config.downloader.target;
      if (target) {
        url =
          (target.inputMode === "browser"
            ? target.browserValue?.value
            : target.manualValue.trim()) || url;
      }
      await this.browser.goto(url);
    }
  }

  execUICommand<C extends UICommand>(
    command: C,
    ...params: ExecUICommandParams<C>
  ) {
    this.emitRendererEvent(
      this.win,
      "execUICommand",
      command,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(params as [any])
    );
  }

  protected emitRendererEvent<E extends RendererEvent>(
    win: BrowserWindow,
    eventName: E,
    ...args: Parameters<RendererEventListener<E>>
  ) {
    win.webContents.send(eventName, ...args);
  }

  on<E extends MainEvent>(
    eventName: E,
    listener: MainEventListener<E>,
    options?: { once?: boolean }
  ): () => void {
    const internalListener = (
      _event: IpcMainEvent,
      ...args: Parameters<MainEventListener<E>>
    ) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (listener as any)(...args);
    };
    const once = options?.once ?? false;
    if (once) {
      ipcMain.once(eventName, internalListener);
    } else {
      ipcMain.on(eventName, internalListener);
    }
    return () => {
      ipcMain.off(eventName, internalListener);
    };
  }
}

const MainProcess = SupportEventSupportMixin(
  DownloadEventSupportMixin(
    EditorEventSupportMixin(
      FileEventSupportMixin(AppMenuSupportMixin(MainProcessBase))
    )
  )
);

export default MainProcess;
