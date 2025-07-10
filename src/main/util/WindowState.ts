import type { MainWindowState as MainWindowState } from "../MainWindow";
import type { WindowState } from "../../common/util/WindowState";
import {
  loadLastWindowState,
  saveWindowState
} from "../../common/util/WindowState";

export function loadLastMainWindowState() {
  return loadLastWindowState("main", isMainWindowState);
}

export function saveMainWindowState(data: MainWindowState) {
  saveWindowState("main", data);
}

function isMainWindowState(data: WindowState): data is MainWindowState {
  return Reflect.has(data, "editorPanelWidth");
}
