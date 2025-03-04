import { app, dialog } from "electron";
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
            this.emitRendererEvent(this.win, "requestHelpResult", {
              contents
            });
            return;
          } catch (error: unknown) {
            dialog.showErrorBox(
              "Error",
              error instanceof Error ? error.message : String(error)
            );
            this.emitRendererEvent(this.win, "helpEnd");
          }
        }),

        this.on("endHelp", () => {
          this.emitRendererEvent(this.win, "helpEnd");
        }),

        this.on("requestAboutInfo", () => {
          this.emitRendererEvent(this.win, "aboutInfo", {
            appName: app.getName(),
            appVersion: app.getVersion(),
            appURL: APP_URL
          });
        }),

        this.on("endAbout", () => {
          this.emitRendererEvent(this.win, "aboutEnd");
        })
      ];
    }
  };
}
