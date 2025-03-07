import { dialog } from "electron";
import { loadUIConfigFromFile } from "../config/FileLoader";
import type { MainProcessConstructor } from "../MainProcess";
import path from "path";
import { EOL } from "os";
import { createEditor } from "../util/Editor";
import type { Editor } from "../../types/App";
import {
  convertUIConfigToFileContentsString,
  saveFileConfig
} from "../config/FileConfig";
import type { FileConfig } from "../../types/FileConfig";
import type { SaveFileConfigResult } from "../../types/MainEvents";
import RecentDocuments from "../util/RecentDocuments";

export function FileEventSupportMixin<TBase extends MainProcessConstructor>(
  Base: TBase
) {
  return class FileEventSupportedProcess extends Base {
    protected registerMainEventListeners() {
      const callbacks = super.registerMainEventListeners();
      return [
        ...callbacks,

        this.on("openFSChooser", async (options) => {
          const result = await dialog.showOpenDialog(this.win, options);
          if (result.canceled) {
            this.emitRendererEvent(this.win, "fsChooserResult", {
              canceled: true
            });
          } else {
            this.emitRendererEvent(this.win, "fsChooserResult", {
              canceled: false,
              filePath: result.filePaths[0]
            });
          }
        }),

        this.on("openFile", async (currentEditors, _filePath?: string) => {
          let filePath;
          if (_filePath) {
            filePath = _filePath;
          } else {
            const result = await dialog.showOpenDialog(this.win, {
              properties: ["openFile"],
              title: "Open file"
            });
            if (result.canceled) {
              this.emitRendererEvent(this.win, "openFileResult", {
                canceled: true
              });
              return;
            }
            filePath = result.filePaths[0];
          }
          const currentEditorWithSameFilePath = currentEditors.find(
            (editor) => editor.filePath === filePath
          );
          if (currentEditorWithSameFilePath) {
            this.emitRendererEvent(this.win, "openFileResult", {
              editor: currentEditorWithSameFilePath,
              isNewEditor: false
            });
            return;
          }
          const { config, alerts } = loadUIConfigFromFile(filePath);
          if (config) {
            const editor = createEditor({
              config,
              name: path.parse(filePath).base,
              filePath,
              loadAlerts: alerts.length > 0 ? alerts : undefined
            });
            if (config.downloader.target.manualValue.trim()) {
              this.browser.goto(config.downloader.target.manualValue, true);
            }
            this.#addRecentDocument(filePath);
            this.emitRendererEvent(this.win, "openFileResult", {
              editor,
              isNewEditor: true
            });
            return;
          }
          dialog.showErrorBox("Error", alerts.map((m) => m.text).join(EOL));
          this.emitRendererEvent(this.win, "openFileResult", {
            hasError: true
          });
        }),

        this.on("save", async (editor: Editor) => {
          if (editor.filePath) {
            const fileConfig = {
              editorId: editor.id,
              name: editor.name,
              filePath: editor.filePath,
              contents: convertUIConfigToFileContentsString(editor.config)
            };
            if (editor.promptOnSave) {
              this.emitRendererEvent(
                this.win,
                "promptOverwriteOnSave",
                fileConfig
              );
            } else {
              this.emitRendererEvent(
                this.win,
                "saveResult",
                this.#doSave(fileConfig)
              );
            }
          } else {
            const result = await this.#doSaveAs(editor);
            this.emitRendererEvent(this.win, "saveResult", result);
          }
        }),

        this.on("confirmSave", (result) => {
          if (result.confirmed) {
            this.emitRendererEvent(
              this.win,
              "saveResult",
              this.#doSave(result.config)
            );
          } else {
            this.emitRendererEvent(this.win, "saveResult", {
              canceled: true
            });
          }
        }),

        this.on("saveAs", async (editor: Editor) => {
          const result = await this.#doSaveAs(editor);
          this.emitRendererEvent(this.win, "saveResult", result);
        }),

        this.on("preview", async (editor) => {
          const fileConfig: FileConfig = {
            editorId: editor.id,
            name: editor.name,
            filePath: editor.filePath,
            contents: convertUIConfigToFileContentsString(editor.config)
          };
          this.emitRendererEvent(this.win, "previewInfo", fileConfig);
        }),

        this.on("endPreview", () => {
          this.emitRendererEvent(this.win, "previewEnd");
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
        contents: convertUIConfigToFileContentsString(editor.config)
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
      this.emitRendererEvent(this.win, "recentDocumentsInfo", {
        entries: RecentDocuments.list()
      });
    }
  };
}
