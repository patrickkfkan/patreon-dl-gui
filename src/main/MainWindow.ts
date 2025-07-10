import { BaseWindow, session } from "electron";
import { DEFAULT_MAIN_WINDOW_PROPS } from "./Constants";
import WebBrowserView from "./views/browser/WebBrowserView";
import EditorView from "./views/editor/EditorView";
import type { Editor } from "./types/App";
import type {
  ViewBounds,
  WebBrowserPageNavigatedInfo
} from "./types/MainEvents";
import type { PageInfo } from "./types/UIConfig";
import ModalView from "./views/modal/ModalView";
import type { ValidateProxyURLResult } from "./util/Config";
import { validateProxyURL } from "./util/Config";
import type { WindowState } from "../common/util/WindowState";

export interface MainWindowState extends WindowState {
  editorPanelWidth: number;
}

export interface MainWindowProps extends Partial<MainWindowState> {
  devTools: boolean;
  webBrowserViewInitialURL: string;
  webBrowserViewUserAgent: string;
}

interface WebBrowserViewEntry {
  navInfo: WebBrowserPageNavigatedInfo;
  editorId: Editor["id"];
  view: WebBrowserView;
  active: boolean;
}

export type ApplyProxyResult =
  | {
      status: "success";
    }
  | {
      status: "error";
      error: string;
    };

export default class MainWindow extends BaseWindow {
  editorView: EditorView;
  modalView: ModalView;
  #webBrowserViews: WebBrowserViewEntry[];
  #initialWebBrowserProps: {
    url: string;
    devTools: boolean;
  };
  #webBrowserViewBounds: Electron.Rectangle | null;
  #editorPanelWidth: number;
  #emitStateChangeEventDelayTimer: NodeJS.Timeout | null;

  constructor(props: MainWindowProps) {
    super();
    const devTools = props.devTools;
    this.#initialWebBrowserProps = {
      url: props.webBrowserViewInitialURL,
      devTools,
    };

    this.editorView = new EditorView();
    this.contentView.addChildView(this.editorView);

    this.modalView = new ModalView();

    this.#webBrowserViews = [];
    this.#webBrowserViewBounds = null;

    const windowSize = props?.size ?? DEFAULT_MAIN_WINDOW_PROPS.size;
    const windowPosition =
      props?.position ?? DEFAULT_MAIN_WINDOW_PROPS.position;
    const windowState = props?.state ?? DEFAULT_MAIN_WINDOW_PROPS.state;
    this.#editorPanelWidth =
      props?.editorPanelWidth ?? DEFAULT_MAIN_WINDOW_PROPS.editorPanelWidth;

    this.setSize(windowSize.width, windowSize.height);
    if (windowState === "maximized") {
      this.maximize();
    } else if (windowPosition) {
      this.setPosition(windowPosition.x, windowPosition.y);
    } else {
      this.center();
    }
    if (devTools) {
      this.editorView.openDevTools();
      this.modalView.openDevTools();
    }

    this.#emitStateChangeEventDelayTimer = null;

    this.contentView.on("bounds-changed", () => {
      this.#syncViewBoundsWithContentView();
      this.#emitStateChangeEvent();
    });

    this.on("move", () => {
      this.#emitStateChangeEvent();
    });

    this.on("minimize", () => {
      this.#emitStateChangeEvent();
    });

    this.setUserAgent(props.webBrowserViewUserAgent);
  }

  async createWebBrowserViewForEditor(
    editor: Editor,
    skipProxyValidation = false
  ) {
    let partition: string | undefined = undefined;
    let proxyURL = editor.config.request["proxy.url"].trim();
    if (proxyURL) {
      const proxyValidation: ValidateProxyURLResult =
        !skipProxyValidation ? validateProxyURL(proxyURL) : { isValid: true };
      if (proxyValidation.isValid) {
        partition = `persist:${new URL(proxyURL).hostname}`;
      } else {
        proxyURL = "";
        this.emitWebBrowserViewEvent("applyProxyResult", {
          status: "error",
          error: proxyValidation.error
        });
      }
    }
    const url =
      editor.config.downloader.target.manualValue.trim() ||
      this.#initialWebBrowserProps.url;
    const newWebBrowserView = new WebBrowserView(partition);
    const newWebBrowserViewEntry: WebBrowserViewEntry = {
      navInfo: {
        url,
        canGoBack: false,
        canGoForward: false
      },
      editorId: editor.id,
      view: newWebBrowserView,
      active: false
    };
    this.#webBrowserViews.push(newWebBrowserViewEntry);
    this.setActiveWebBrowserViewByEditor(editor);

    newWebBrowserView.onWebBrowserViewEvent("pageNavigated", (info) => {
      newWebBrowserViewEntry.navInfo = info;
      if (newWebBrowserView !== this.webBrowserView) {
        return;
      }
      this.emitWebBrowserViewEvent("pageNavigated", info);
    });
    newWebBrowserView.onWebBrowserViewEvent("pageInfo", (info) => {
      if (newWebBrowserView !== this.webBrowserView) {
        return;
      }
      this.emitWebBrowserViewEvent("pageInfo", info);
    });

    if (this.#initialWebBrowserProps.devTools) {
      newWebBrowserView.openDevTools();
    }
    if (this.#webBrowserViewBounds) {
      newWebBrowserView.setBounds(this.#webBrowserViewBounds);
    }

    if (proxyURL) {
      await newWebBrowserView.setProxy(
        proxyURL,
        editor.config.request["proxy.reject.unauthorized.tls"]
      );
      this.emitWebBrowserViewEvent("applyProxyResult", { status: "success" });
    }

    newWebBrowserView.gotoURL(url);
  }

  async applyProxy(editor: Editor) {
    const view = this.webBrowserView;
    const proxyURL = editor.config.request["proxy.url"].trim();
    const currentProxyURL = view?.proxy?.url || "";
    if (
      (currentProxyURL === "" && proxyURL === "") ||
      (currentProxyURL === proxyURL &&
        editor.config.request["proxy.reject.unauthorized.tls"] ===
          view?.proxy?.rejectUnauthorizedTLS)
    ) {
      return;
    }
    if (proxyURL) {
      const proxyValidation = validateProxyURL(proxyURL);
      if (!proxyValidation.isValid) {
        this.emitWebBrowserViewEvent("applyProxyResult", {
          status: "error",
          error: proxyValidation.error
        });
        return;
      }
    }
    await this.removeWebBrowserViewForEditor(editor);
    await this.createWebBrowserViewForEditor(editor, true);
    if (!proxyURL) {
      // Emit event because createWebBrowserViewForEditor() doesn't do this when there's no proxy
      this.emitWebBrowserViewEvent("applyProxyResult", { status: "success" });
    }
  }

  setActiveWebBrowserViewByEditor(editor: Editor) {
    const currentActiveEntry = this.#webBrowserViews.find(
      (entry) => entry.active
    );
    const newActiveEntry = this.#webBrowserViews.find(
      (entry) => entry.editorId === editor.id
    );
    if (!newActiveEntry) {
      console.error(
        `Could not set active WebBrowserView for editor ID ${editor.id}: view does not exist`
      );
      return;
    }
    if (currentActiveEntry?.view === newActiveEntry.view) {
      return;
    }
    newActiveEntry.active = true;
    this.emitWebBrowserViewEvent("pageNavigated", newActiveEntry.navInfo);
    if (currentActiveEntry) {
      currentActiveEntry.active = false;
      this.contentView.removeChildView(currentActiveEntry.view);
    }
    this.contentView.addChildView(newActiveEntry.view);
  }

  async removeWebBrowserViewForEditor(editor: Editor) {
    const entryIndex = this.#webBrowserViews.findIndex(
      (entry) => entry.editorId === editor.id
    );
    if (entryIndex < 0) {
      console.error(
        `Could not remove WebBrowserView for editor ID ${editor.id}: view does not exist`
      );
      return;
    }
    const entry = this.#webBrowserViews[entryIndex];
    await entry.view.destroy();
    this.contentView.removeChildView(entry.view);
    this.#webBrowserViews.splice(entryIndex, 1);
  }

  #syncViewBoundsWithContentView() {
    this.editorView.setBounds(this.contentView.getBounds());
    this.modalView.setBounds(this.contentView.getBounds());
  }

  updateViewBounds(bounds: ViewBounds) {
    this.#webBrowserViewBounds = bounds.webBrowserView;
    this.#webBrowserViews.forEach((entry) =>
      entry.view.setBounds(bounds.webBrowserView)
    );
    this.#editorPanelWidth = bounds.editorView.width;
    this.#emitStateChangeEvent();
  }

  showModalView() {
    this.contentView.addChildView(this.modalView);
  }

  hideModalView() {
    this.contentView.removeChildView(this.modalView);
  } 
    
  setUserAgent(userAgent: string) {
    session.defaultSession.webRequest.onBeforeSendHeaders(null);
    session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
      details.requestHeaders["User-Agent"] = userAgent;
      callback({ requestHeaders: details.requestHeaders });
    });
  }

  async clearSessionData(reload = false) {
    console.debug("Clearing web browser session data...");
    await Promise.all(this.#webBrowserViews.map((entry) => entry.view.clearSessionData()));
    if (reload) {
      this.#webBrowserViews.forEach((entry) => entry.view.reload());
    }
  }

  #emitStateChangeEvent() {
    if (this.#emitStateChangeEventDelayTimer) {
      clearTimeout(this.#emitStateChangeEventDelayTimer);
    }
    this.#emitStateChangeEventDelayTimer = setTimeout(() => {
      this.emitMainWindowEvent("stateChange", this.getStateInfo());
    }, 500);
  }

  async destroy() {
    this.removeAllListeners();
    await Promise.all(
      this.#webBrowserViews.map((entry) => entry.view.destroy())
    );
    this.editorView.destroy();
    this.modalView.destroy();
    this.close();
  }

  async launch() {
    await this.editorView.load();
    await this.modalView.load();
    this.#syncViewBoundsWithContentView();
    this.show();
  }

  getStateInfo(): MainWindowState {
    const [width, height] = this.getSize();
    const [x, y] = this.getPosition();
    return {
      size: { width, height },
      position: { x, y },
      editorPanelWidth: this.#editorPanelWidth,
      state:
        this.isMaximized() ? "maximized"
        : this.isMinimized() ? "minimized"
        : "normal"
    };
  }

  get webBrowserView() {
    return this.#webBrowserViews.find((entry) => entry.active)?.view || null;
  }

  emitMainWindowEvent(event: "stateChange", info: MainWindowState): boolean;
  emitMainWindowEvent(event: string, ...args: unknown[]) {
    return this.emit(event, ...args);
  }

  onMainWindowEvent(
    event: "stateChange",
    listener: (info: MainWindowState) => void
  ): this;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onMainWindowEvent(event: string, listener: (...args: any[]) => void) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.on(event as any, listener);
  }

  emitWebBrowserViewEvent(
    event: "applyProxyResult",
    result: ApplyProxyResult
  ): boolean;
  emitWebBrowserViewEvent(
    event: "pageNavigated",
    info: WebBrowserPageNavigatedInfo
  ): boolean;
  emitWebBrowserViewEvent(event: "pageInfo", info: PageInfo): boolean;
  emitWebBrowserViewEvent(event: string, ...args: unknown[]) {
    return this.emit(event, ...args);
  }

  onWebBrowserViewEvent(
    event: "applyProxyResult",
    listener: (result: ApplyProxyResult) => void
  ): this;
  onWebBrowserViewEvent(
    event: "pageNavigated",
    listener: (info: WebBrowserPageNavigatedInfo) => void
  ): this;
  onWebBrowserViewEvent(
    event: "pageInfo",
    listener: (info: PageInfo) => void
  ): this;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onWebBrowserViewEvent(event: string, listener: (...args: any[]) => void) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.on(event as any, listener);
  }
}
