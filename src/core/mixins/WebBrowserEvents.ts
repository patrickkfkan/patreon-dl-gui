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

        this.on("setWebBrowserURL", (url) => {
          this.win.webBrowserView?.gotoURL(url);
        }),

        this.on("setWebBrowserURLToHome", () => {
          this.win.webBrowserView?.gotoURL(PATREON_URL);
        }),

        this.on("webBrowserBack", () => {
          this.win.webBrowserView?.goBack();
        }),

        this.on("webBrowserForward", () => {
          this.win.webBrowserView?.goForward();
        }),

        this.on("viewBounds", (bounds) => {
          this.win.updateViewBounds(bounds);
        })
      ];
    }
  };
}
