import { BrowserWindow } from "electron";

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

export interface MainWindowProps {
  size?: { w?: number; h?: number };
  devTools?: boolean;
}

export default class MainWindow extends BrowserWindow {
  constructor() {
    super({
      webPreferences: {
        sandbox: false,
        preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY
      }
    });
  }

  static create(props?: MainWindowProps) {
    const w = props?.size?.w || 530;
    const h = props?.size?.h || 845;
    const devTools = props?.devTools ?? false;
    const win = new MainWindow();
    win.setSize(w, h);
    if (devTools) {
      win.webContents.openDevTools();
    }
    return win;
  }

  async launch() {
    await this.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
    this.show();
  }
}
