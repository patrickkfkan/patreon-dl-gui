import { app, BrowserWindow } from "electron";
import path from "path";
import { DEFAULT_SERVER_CONSOLE_WINDOW_PROPS } from "./Constants";
import { ConstrainedWindowState, WindowState } from "../common/util/WindowState";
import { fileURLToPath } from "url";

declare const SERVER_CONSOLE_VITE_DEV_SERVER_URL: string;
declare const SERVER_CONSOLE_VITE_NAME: string;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export type ServerConsoleWindowState = WindowState;

export interface ServerConsoleWindowProps extends Partial<ServerConsoleWindowState & ConstrainedWindowState> {
  devTools?: boolean;
}

export default class ServerConsoleWindow extends BrowserWindow {
  #emitStateChangeEventDelayTimer: NodeJS.Timeout | null;
 
  constructor(props?: ServerConsoleWindowProps) {
    const devTools = props?.devTools ?? DEFAULT_SERVER_CONSOLE_WINDOW_PROPS.devTools;
    super({
      webPreferences: {
        sandbox: false,
        preload: path.join(__dirname, 'server-console-preload.mjs'),
        devTools
      },
      title: `Server Console - ${app.getName()}`
    });

    const windowSize = props?.size ?? DEFAULT_SERVER_CONSOLE_WINDOW_PROPS.size;
    const windowPosition =
      props?.position ?? DEFAULT_SERVER_CONSOLE_WINDOW_PROPS.position;
    const windowState = props?.state ?? DEFAULT_SERVER_CONSOLE_WINDOW_PROPS.state;

    this.setMinimumSize(
      DEFAULT_SERVER_CONSOLE_WINDOW_PROPS.minSize.width,
      DEFAULT_SERVER_CONSOLE_WINDOW_PROPS.minSize.height
    );

    this.setSize(windowSize.width, windowSize.height);
    if (windowState === "maximized") {
      this.maximize();
    } else if (windowPosition) {
      this.setPosition(windowPosition.x, windowPosition.y);
    } else {
      this.center();
    }

    if (devTools) {
      this.webContents.openDevTools();
    }

    this.#emitStateChangeEventDelayTimer = null;

    this.on("resize", () => {
      this.#emitStateChangeEvent();
    });

    this.on("move", () => {
      this.#emitStateChangeEvent();
    });

    this.on("minimize", () => {
      this.#emitStateChangeEvent();
    });   
  }

  #emitStateChangeEvent() {
    if (this.#emitStateChangeEventDelayTimer) {
      clearTimeout(this.#emitStateChangeEventDelayTimer);
    }
    this.#emitStateChangeEventDelayTimer = setTimeout(() => {
      this.emitServerConsoleWindowEvent("stateChange", this.getStateInfo());
    }, 500);
  }

  async destroy() {
    this.removeAllListeners();
    this.close();
  }

  async launch() {
    if (SERVER_CONSOLE_VITE_DEV_SERVER_URL) {
      // Development: load from Vite dev server
      await this.webContents.loadURL(SERVER_CONSOLE_VITE_DEV_SERVER_URL);
    } else {
      // Production: load the built HTML file
      await this.webContents.loadFile(path.resolve(__dirname, `../renderer/${SERVER_CONSOLE_VITE_NAME}/index.html`));
    }
    this.show();
  }

  getStateInfo(): ServerConsoleWindowState {
    const [width, height] = this.getSize();
    const [x, y] = this.getPosition();
    return {
      size: { width, height },
      position: { x, y },
      state:
        this.isMaximized() ? "maximized"
        : this.isMinimized() ? "minimized"
        : "normal"
    };
  }

  emitServerConsoleWindowEvent(event: "stateChange", info: ServerConsoleWindowState): boolean;
  emitServerConsoleWindowEvent(event: string, ...args: unknown[]) {
    return this.emit(event, ...args);
  }

  onServerConsoleWindowEvent(
    event: "stateChange",
    listener: (info: ServerConsoleWindowState) => void
  ): this;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onServerConsoleWindowEvent(event: string, listener: (...args: any[]) => void) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.on(event as any, listener);
  }
}
