import { dialog } from "electron";
import type { MainProcessConstructor } from "../MainProcess";
import { createEditor } from "../util/Editor";

export function EditorEventSupportMixin<TBase extends MainProcessConstructor>(
  Base: TBase
) {
  return class EditorEventSupportedProcess extends Base {
    protected registerMainEventListeners() {
      const callbacks = super.registerMainEventListeners();
      return [
        ...callbacks,

        this.on("newEditor", () => {
          this.emitRendererEvent(this.win, "editorCreated", createEditor());
        }),

        this.on("closeEditor", async (editor) => {
          if (editor.modified) {
            const dialogOpts = {
              title: "Confirm",
              message: `"${editor.name}" has been modified. Discard changes?`,
              buttons: ["Cancel", "Discard"],
              cancelId: 0,
              defaultId: 1
            };
            const result = await dialog.showMessageBox(this.win, dialogOpts);
            if (result.response === dialogOpts.cancelId) {
              this.emitRendererEvent(this.win, "closeEditorResult", {
                canceled: true
              });
              return;
            }
          }
          this.emitRendererEvent(this.win, "closeEditorResult", {
            canceled: false,
            editor
          });
        }),

        this.on("activeEditorInfo", (info) => {
          const shouldRefreshMenu =
            (this.activeEditor === null || info.editor === null) &&
            this.activeEditor !== info.editor;
          this.activeEditor = info.editor;
          if (shouldRefreshMenu) {
            this.setAppMenu({
              enabled: {
                save: !!this.activeEditor,
                saveAs: !!this.activeEditor,
                preview: !!this.activeEditor,
                startDownload: !!this.activeEditor
              }
            });
          }
        }),

        this.on("modifiedEditorsInfo", (info) => {
          this.modifiedEditors = info.editors;
        })
      ];
    }
  };
}
