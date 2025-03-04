import type { Editor } from "../../types/App";
import { getStartupUIConfig } from "../config/UIConfig";

let editorId = 0;

export function createEditor(
  props?: Pick<Editor, "config" | "filePath" | "name" | "loadAlerts">
) {
  const config = props?.config || null;
  const filePath = props?.filePath || null;
  const name = props?.name || null;
  const editor: Editor = {
    id: editorId,
    name: name || (editorId > 0 ? `Untitled-${editorId}` : "Untitled"),
    filePath: filePath,
    config: config || getStartupUIConfig(),
    modified: false,
    promptOnSave: !!filePath
  };
  if (props?.loadAlerts && props.loadAlerts.length > 0) {
    editor.loadAlerts = props.loadAlerts;
  }
  editorId++;
  return editor;
}
