import { app, dialog, shell } from "electron";
import type { MainProcessConstructor } from "../MainProcess";
import { getHelpContents } from "../util/Help";
import { APP_URL } from "../Constants";

export function SupportEventSupportMixin<TBase extends MainProcessConstructor>(
  Base: TBase
) {
  return class SupportEventSupportedProcess extends Base {
    protected registerMainEventListeners() {
      const callbacks = super.registerMainEventListeners();
      return [
        ...callbacks,

        this.on("requestHelp", (section, prop) => {
          try {
            const contents = getHelpContents(section, prop);
            this.win.showModalView();
            this.emitRendererEvent(this.win.modalView, "requestHelpResult", {
              contents
            });
            return;
          } catch (error: unknown) {
            dialog.showErrorBox(
              "Error",
              error instanceof Error ? error.message : String(error)
            );
            this.emitRendererEvent(this.win.editorView, "helpEnd");
          }
        }),

        this.on("endHelp", () => {
          this.win.hideModalView();
          this.emitRendererEvent(this.win.editorView, "helpEnd");
        }),

        this.on("requestAboutInfo", () => {
          this.win.showModalView();
          this.emitRendererEvent(this.win.modalView, "aboutInfo", {
            appName: app.getName(),
            appVersion: app.getVersion(),
            appURL: APP_URL
          });
        }),

        this.on("endAbout", () => {
          this.win.hideModalView();
          this.emitRendererEvent(this.win.editorView, "aboutEnd");
        }),

        this.on("openExternalBrowser", (url) => {
          shell.openExternal(url);
        })
      ];
    }
  };
}
