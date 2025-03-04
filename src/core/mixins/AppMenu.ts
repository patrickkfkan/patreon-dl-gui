import { Menu } from "electron";
import type { MainProcessConstructor } from "../MainProcess";
import RecentDocuments from "../util/RecentDocuments";

export interface AppMenuOptions {
  enabled?: {
    save?: boolean;
    saveAs?: boolean;
    preview?: boolean;
    startDownload?: boolean;
  };
}

export function AppMenuSupportMixin<TBase extends MainProcessConstructor>(
  Base: TBase
) {
  return class AppMenuSupportedProcess extends Base {
    #currentAppMenuOptions?: AppMenuOptions;

    setAppMenu(options?: AppMenuOptions) {
      options = options || this.#currentAppMenuOptions;
      const recentDocuments = RecentDocuments.list();
      const recentDocumentMenuItems =
        recentDocuments.map<Electron.MenuItemConstructorOptions>((doc) => ({
          label: doc.name,
          click: () => this.execUICommand("openFile", doc.filePath)
        }));
      if (recentDocuments.length > 0) {
        recentDocumentMenuItems.push(
          {
            type: "separator"
          },
          {
            label: "Clear Recent",
            click: () => {
              RecentDocuments.clear();
              this.setAppMenu();
              this.emitRendererEvent(this.win, "recentDocumentsInfo", {
                entries: RecentDocuments.list()
              });
            }
          }
        );
      }
      Menu.setApplicationMenu(
        Menu.buildFromTemplate([
          {
            label: "&File",
            submenu: [
              {
                label: "&New",
                accelerator: "CommandOrControl+N",
                click: () => this.execUICommand("createEditor")
              },
              {
                label: "&Open",
                accelerator: "CommandOrControl+O",
                click: () => this.execUICommand("openFile")
              },
              {
                label: "Open Recent",
                visible: recentDocumentMenuItems.length > 0,
                submenu: recentDocumentMenuItems
              },
              {
                label: "&Save",
                accelerator: "CommandOrControl+S",
                enabled: options?.enabled?.save ?? true,
                click: () => this.execUICommand("save")
              },
              {
                label: "Save &As...",
                enabled: options?.enabled?.saveAs ?? true,
                click: () => this.execUICommand("saveAs")
              },
              {
                type: "separator"
              },
              {
                label: "Pre&view",
                accelerator: "CommandOrControl+Shift+P",
                enabled: options?.enabled?.preview ?? true,
                click: () => this.execUICommand("preview")
              },
              {
                type: "separator"
              },
              {
                label: "E&xit",
                click: () => this.end()
              }
            ]
          },
          {
            label: "&Run",
            submenu: [
              {
                label: "Start &Download",
                accelerator: "F5",
                enabled: options?.enabled?.startDownload ?? true,
                click: () => this.execUICommand("startDownload")
              }
            ]
          },
          {
            label: "&Help",
            submenu: [
              {
                type: "checkbox",
                label: "Show Help &Icons",
                checked: false,
                click: (e) => {
                  this.execUICommand("showHelpIcons", e.checked);
                }
              },
              {
                type: "separator"
              },
              {
                label: "About",
                click: () => {
                  this.execUICommand("showAbout");
                }
              }
            ]
          }
        ])
      );
      this.#currentAppMenuOptions = options;
    }
  };
}
