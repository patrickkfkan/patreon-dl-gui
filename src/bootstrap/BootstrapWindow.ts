import { BrowserWindow } from "electron";

declare const BOOTSTRAP_WINDOW_WEBPACK_ENTRY: string;
declare const BOOTSTRAP_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

export interface BootstrapWindowProps {
  size?: { w?: number; h?: number };
  devTools?: boolean;
}

export default class BootstrapWindow extends BrowserWindow {
  constructor() {
    super({
      webPreferences: {
        sandbox: false,
        preload: BOOTSTRAP_WINDOW_PRELOAD_WEBPACK_ENTRY
      },
      center: true,
      resizable: false
    });
    this.setMenu(null);
  }

  static create(props?: BootstrapWindowProps) {
    const w = props?.size?.w || 480;
    const h = props?.size?.h || 240;
    const devTools = props?.devTools ?? false;
    const win = new BootstrapWindow();
    win.setMinimumSize(w, h);
    win.setSize(w, h);
    if (devTools) {
      win.webContents.openDevTools();
    }
    return win;
  }

  async launch() {
    await this.loadURL(BOOTSTRAP_WINDOW_WEBPACK_ENTRY);
    this.show();
  }
}
