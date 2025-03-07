import MainWindow, { type MainWindowProps } from "./MainWindow";
import PatreonBrowser from "./PatreonBrowser";
import type { Editor } from "../types/App";
import type { UICommand, ExecUICommandParams } from "../types/MainEvents";
import type DownloaderConsoleLogger from "./DownloaderConsoleLogger";
import { dialog } from "electron";
import type PatreonDownloader from "patreon-dl";
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
import ProcessBase from "../ProcessBase";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MainProcessConstructor = new (...args: any[]) => MainProcessBase;

export interface MainProcessInitArgs {
  mainWindow?: MainWindowProps;
  browser: { executablePath: string };
  patreonURL?: URL;
}

export interface DownloaderBundle {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  instance: PatreonDownloader<any>;
  consoleLogger: DownloaderConsoleLogger;
  abortController: AbortController;
  status: "init" | "running" | "end";
}

class MainProcessBase extends ProcessBase<"main"> {
  protected win: MainWindow;
  protected browser: PatreonBrowser;
  protected browserExecutablePath: string;
  protected activeEditor: Editor | null;
  protected modifiedEditors: Editor[];
  protected downloader: DownloaderBundle | null;
  #initialURL: URL;
  #removeListenerCallbacks: (() => void)[];

  constructor(args: MainProcessInitArgs) {
    super();
    this.win = MainWindow.create(args.mainWindow);
    this.browserExecutablePath = args.browser.executablePath;
    this.browser = this.#createPatreonBrowser(this.browserExecutablePath);
    this.activeEditor = null;
    this.modifiedEditors = [];
    this.downloader = null;
    this.#initialURL = args?.patreonURL || new URL("https://www.patreon.com");
    this.#removeListenerCallbacks = [];
  }

  #createPatreonBrowser(executablePath: string) {
    const browser = new PatreonBrowser({ executablePath });
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
      this.browser = this.#createPatreonBrowser(this.browserExecutablePath);
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
}

const MainProcess = SupportEventSupportMixin(
  DownloadEventSupportMixin(
    EditorEventSupportMixin(
      FileEventSupportMixin(AppMenuSupportMixin(MainProcessBase))
    )
  )
);

export default MainProcess;
