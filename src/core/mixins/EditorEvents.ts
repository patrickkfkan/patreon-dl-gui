import { dialog } from "electron";
import type { MainProcessConstructor } from "../MainProcess";

export function EditorEventSupportMixin<TBase extends MainProcessConstructor>(
  Base: TBase
) {
  return class EditorEventSupportedProcess extends Base {
    protected registerMainEventListeners() {
      const callbacks = super.registerMainEventListeners();
      return [
        ...callbacks,

        this.handle("newEditor", async () => {
          await this.createEditor(null, (editor) => {
            this.emitRendererEvent(
              this.win.editorView,
              "editorCreated",
              editor
            );
          });
        }),

        this.handle("closeEditor", async (editor) => {
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
              return {
                canceled: true
              };
            }
          }
          await this.win.removeWebBrowserViewForEditor(editor);
          return {
            canceled: false,
            editor
          };
        }),

        this.on("activeEditorChange", (info) => {
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
          if (info.editor) {
            this.win.setActiveWebBrowserViewByEditor(info.editor);
          }
        }),

        this.on("modifiedEditorsChange", (info) => {
          this.modifiedEditors = info.editors;
        }),

        this.handle("applyProxy", (editor) => {
          return this.win.applyProxy(editor);
        })
      ];
    }
  };
}
