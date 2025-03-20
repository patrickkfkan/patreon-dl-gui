import { WebContentsView } from "electron";

declare const MODAL_WINDOW_WEBPACK_ENTRY: string;
declare const MODAL_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

export default class ModalView extends WebContentsView {
  constructor() {
    super({
      webPreferences: {
        sandbox: false,
        preload: MODAL_WINDOW_PRELOAD_WEBPACK_ENTRY
      }
    });
    this.setBackgroundColor("#00000000");
  }

  openDevTools() {
    this.webContents.openDevTools();
  }

  closeDevTools() {
    this.webContents.closeDevTools();
  }

  load() {
    return this.webContents.loadURL(MODAL_WINDOW_WEBPACK_ENTRY);
  }

  destroy() {
    this.removeAllListeners();
    this.webContents.close();
  }
}
