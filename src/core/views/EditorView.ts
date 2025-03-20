import { WebContentsView } from "electron";

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

export default class EditorView extends WebContentsView {
  constructor() {
    super({
      webPreferences: {
        sandbox: false,
        preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY
      }
    });
  }

  openDevTools() {
    this.webContents.openDevTools();
  }

  closeDevTools() {
    this.webContents.closeDevTools();
  }

  load() {
    return this.webContents.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
  }

  destroy() {
    this.removeAllListeners();
    this.webContents.close();
  }
}
