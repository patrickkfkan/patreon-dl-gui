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

        this.handle("requestHelp", (section, prop) => {
          return new Promise<void>((resolve) => {
            try {
              const contents = getHelpContents(section, prop);

              this.on(
                "helpModalClose",
                () => {
                  this.win.hideModalView();
                  resolve();
                },
                { once: true }
              );

              this.win.showModalView();
              this.emitRendererEvent(this.win.modalView, "requestHelpResult", {
                contents
              });
            } catch (error: unknown) {
              dialog.showErrorBox(
                "Error",
                error instanceof Error ? error.message : String(error)
              );
              this.win.hideModalView();
              resolve();
            }
          });
        }),

        this.handle("requestAboutInfo", () => {
          return new Promise<void>((resolve) => {
            this.on(
              "aboutModalClose",
              () => {
                this.win.hideModalView();
                resolve();
              },
              { once: true }
            );
            this.win.showModalView();
            this.emitRendererEvent(this.win.modalView, "aboutInfo", {
              appName: app.getName(),
              appVersion: app.getVersion(),
              appURL: APP_URL
            });
          });
        }),

        this.handle("openExternalBrowser", (url) => {
          return shell.openExternal(url);
        })
      ];
    }
  };
}
