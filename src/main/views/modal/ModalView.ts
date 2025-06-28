import { WebContentsView } from "electron";
import { fileURLToPath } from 'url';
import path from 'path';

declare const MODAL_VIEW_VITE_DEV_SERVER_URL: string;
declare const MODAL_VIEW_VITE_NAME: string;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default class ModalView extends WebContentsView {
  constructor() {
    super({
      webPreferences: {
        sandbox: false,
        preload: path.join(__dirname, 'modal-view-preload.mjs')
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
    if (MODAL_VIEW_VITE_DEV_SERVER_URL) {
      // Development: load from Vite dev server
      return this.webContents.loadURL(MODAL_VIEW_VITE_DEV_SERVER_URL);
    } else {
      // Production: load the built HTML file
      return this.webContents.loadFile(path.resolve(__dirname, `../renderer/${MODAL_VIEW_VITE_NAME}/index.html`));
    }
  }

  destroy() {
    this.removeAllListeners();
    this.webContents.close();
  }
}
