import { APP_DATA_PATH } from "../../common/Constants";
import path from "path";
import fs from "fs-extra";
import type { MainWindowStateInfo } from "../MainWindow";

const windowStateFilePath = path.join(APP_DATA_PATH, "/WindowState.json");

export function loadLastWindowState() {
  if (!fs.existsSync(windowStateFilePath)) {
    return null;
  }
  try {
    const data = fs.readJSONSync(windowStateFilePath);
    if (!isMainWindowStateInfo(data)) {
      console.warn(
        "Last window state data has unexpected structure - ignoring it."
      );
      return null;
    }
    return data;
  } catch (error: unknown) {
    console.error(
      "Failed to load last window state:",
      error instanceof Error ? error.message : String(error)
    );
  }
}

export function saveWindowState(data: MainWindowStateInfo) {
  try {
    fs.writeJSONSync(windowStateFilePath, data);
  } catch (error: unknown) {
    console.error(
      "Failed to write window state to file:",
      error instanceof Error ? error.message : String(error)
    );
  }
}

function isMainWindowStateInfo(data: unknown): data is MainWindowStateInfo {
  if (!data || !(typeof data === "object")) {
    return false;
  }
  return (
    Reflect.has(data, "size") &&
    Reflect.has(data, "position") &&
    Reflect.has(data, "state") &&
    Reflect.has(data, "editorPanelWidth")
  );
}
