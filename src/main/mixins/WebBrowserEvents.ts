import { PATREON_URL } from "../Constants";
import type { MainProcessConstructor } from "../MainProcess";

export function WebBrowserEventSupportMixin<
  TBase extends MainProcessConstructor
>(Base: TBase) {
  return class WebBrowserEventSupportedProcess extends Base {
    protected registerMainEventListeners() {
      const callbacks = super.registerMainEventListeners();
      return [
        ...callbacks,

        this.handle("setWebBrowserURL", (url) => {
          this.win.webBrowserView?.gotoURL(url);
        }),

        this.handle("setWebBrowserURLToHome", () => {
          this.win.webBrowserView?.gotoURL(PATREON_URL);
        }),

        this.handle("webBrowserBack", () => {
          this.win.webBrowserView?.goBack();
        }),

        this.handle("webBrowserForward", () => {
          this.win.webBrowserView?.goForward();
        }),

        this.handle("webBrowserReload", () => {
          this.win.webBrowserView?.reload();
        }),

        this.on("viewBoundsChange", (bounds) => {
          this.win.updateViewBounds(bounds);
        })
      ];
    }
  };
}
