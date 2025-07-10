import { dialog } from "electron";
import { loadUIConfigFromFile } from "../config/FileLoader";
import type { MainProcessConstructor } from "../MainProcess";
import path from "path";
import { EOL } from "os";
import type { Editor } from "../types/App";
import {
  convertUIConfigToFileContentsString,
  saveFileConfig
} from "../config/FileConfig";
import type { FileConfig } from "../types/FileConfig";
import type { SaveFileConfigResult } from "../types/MainEvents";
import RecentDocuments from "../util/RecentDocuments";
import type { OpenFileResult } from "../types/MainInvocableMethods";
import { openFSChooser } from "../../common/util/FS";

export function FileEventSupportMixin<TBase extends MainProcessConstructor>(
  Base: TBase
) {
  return class FileEventSupportedProcess extends Base {
    protected registerMainEventListeners() {
      const callbacks = super.registerMainEventListeners();
      return [
        ...callbacks,

        this.handle("openFSChooser", async (options) => {
          return await openFSChooser(this.win, options);
        }),

        this.handle("openFile", async (currentEditors, _filePath?: string) => {
          let filePath;
          if (_filePath) {
            filePath = _filePath;
          } else {
            const result = await dialog.showOpenDialog(this.win, {
              properties: ["openFile"],
              title: "Open file"
            });
            if (result.canceled) {
              return {
                canceled: true
              };
            }
            filePath = result.filePaths[0];
          }
          const currentEditorWithSameFilePath = currentEditors.find(
            (editor) => editor.filePath === filePath
          );
          if (currentEditorWithSameFilePath) {
            return {
              editor: currentEditorWithSameFilePath,
              isNewEditor: false
            };
          }
          const { config, alerts } = loadUIConfigFromFile(filePath);
          if (config) {
            return new Promise<OpenFileResult>((resolve) => {
              this.createEditor(
                {
                  config,
                  name: path.parse(filePath).base,
                  filePath,
                  loadAlerts: alerts.length > 0 ? alerts : undefined
                },
                (editor) => {
                  resolve({
                    editor,
                    isNewEditor: true
                  });
                }
              ).then(() => {
                this.#addRecentDocument(filePath);
              });
            });
          }
          dialog.showErrorBox("Error", alerts.map((m) => m.text).join(EOL));
          return {
            hasError: true
          };
        }),

        this.handle("save", async (editor: Editor) => {
          return new Promise<SaveFileConfigResult>((resolve) => {
            if (editor.filePath) {
              const fileConfig = {
                editorId: editor.id,
                name: editor.name,
                filePath: editor.filePath,
                contents: convertUIConfigToFileContentsString(editor.config, {
                  userAgent: this.resolvedUserAgent
                })
              };
              if (editor.promptOnSave) {
                this.on(
                  "confirmSave",
                  (result) => {
                    if (result.confirmed) {
                      resolve(this.#doSave(result.config));
                    } else {
                      resolve({
                        canceled: true
                      });
                    }
                  },
                  { once: true }
                );

                this.on(
                  "confirmSaveModalClose",
                  () => {
                    this.win.hideModalView();
                  },
                  { once: true }
                );

                this.win.showModalView();
                this.emitRendererEvent(
                  this.win.modalView,
                  "promptOverwriteOnSave",
                  fileConfig
                );
              } else {
                resolve(this.#doSave(fileConfig));
              }
            } else {
              this.#doSaveAs(editor).then(resolve);
            }
          });
        }),

        this.handle("saveAs", async (editor: Editor) => {
          return await this.#doSaveAs(editor);
        }),

        this.handle("preview", (editor) => {
          return new Promise<void>((resolve) => {
            const fileConfig: FileConfig = {
              editorId: editor.id,
              name: editor.name,
              filePath: editor.filePath,
              contents: convertUIConfigToFileContentsString(editor.config, {
                userAgent: this.resolvedUserAgent
              })
            };

            this.on(
              "previewModalClose",
              () => {
                this.win.hideModalView();
                resolve();
              },
              { once: true }
            );

            this.win.showModalView();
            this.emitRendererEvent(
              this.win.modalView,
              "previewInfo",
              fileConfig
            );
          });
        })
      ];
    }

    async #doSaveAs(editor: Editor): Promise<SaveFileConfigResult> {
      const result = await dialog.showSaveDialog(this.win, {
        properties: ["showOverwriteConfirmation"],
        title: "Save"
      });
      if (result.canceled) {
        return {
          canceled: true
        };
      }
      return this.#doSave({
        editorId: editor.id,
        name: path.parse(result.filePath).base,
        filePath: result.filePath,
        contents: convertUIConfigToFileContentsString(editor.config, {
          userAgent: this.resolvedUserAgent
        })
      });
    }

    #doSave(config: FileConfig<"hasPath">): SaveFileConfigResult {
      const result = saveFileConfig(config);
      if (result.hasError) {
        dialog.showErrorBox("Error", result.error);
      } else {
        this.#addRecentDocument(config.filePath);
      }
      return result;
    }

    #addRecentDocument(filePath: string) {
      RecentDocuments.add({
        name: path.parse(filePath).base,
        filePath
      });
      this.setAppMenu();
      this.emitRendererEvent(this.win.editorView, "recentDocumentsInfo", {
        entries: RecentDocuments.list()
      });
    }
  };
}
