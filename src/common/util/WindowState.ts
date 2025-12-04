import { APP_DATA_PATH } from "../Constants";
import path from "path";
import fs from "fs-extra";
import { getErrorString } from "./Misc";

export interface WindowState {
  size: { width: number; height: number };
  position: { x: number; y: number };
  state: "normal" | "maximized" | "minimized";
}

export interface ConstrainedWindowState extends WindowState {
  minSize?: { width: number; height: number };
}

const WINDOW_STATE_FILE_PATH = path.join(APP_DATA_PATH, "/WindowState.json");

class CachedWindowStates {
  static #cachedWindowStates: Record<string, unknown> | null = null;

  static get() {
    if (this.#cachedWindowStates) {
      return this.#cachedWindowStates;
    }
    let cached = {};
    if (fs.existsSync(WINDOW_STATE_FILE_PATH)) {
      try {
        cached = fs.readJSONSync(WINDOW_STATE_FILE_PATH) || {};
      } catch (error: unknown) {
        console.error(
          `Failed to load last window states from "${WINDOW_STATE_FILE_PATH}":`,
          getErrorString(error)
        );
      }
    }
    this.#cachedWindowStates = cached;
    return this.#cachedWindowStates;
  }
}

export function loadLastWindowState(windowName: string): WindowState | null;
export function loadLastWindowState<T extends WindowState>(
  windowName: string,
  validateFn: (data: WindowState) => data is T
): T | null;
export function loadLastWindowState<T extends WindowState = WindowState>(
  windowName: string,
  validateFn?: (data: WindowState) => data is T
) {
  const _validateFn = validateFn ?? isWindowState;
  const data = CachedWindowStates.get()[windowName];
  if (!data) {
    return null;
  }
  if (!isWindowState(data) || !_validateFn(data)) {
    console.warn(
      `Last ${windowName} window state data has unexpected structure - ignoring it.`
    );
    return null;
  }
  return data;
}

export function saveWindowState<T extends WindowState>(
  windowName: string,
  data: T
) {
  const current = CachedWindowStates.get();
  current[windowName] = data;
  try {
    fs.writeJSONSync(WINDOW_STATE_FILE_PATH, current);
  } catch (error: unknown) {
    console.error(
      `Failed to write ${windowName} window state to file:`,
      getErrorString(error)
    );
  }
}

function isWindowState(data: unknown): data is WindowState {
  if (!data || !(typeof data === "object")) {
    return false;
  }
  return (
    Reflect.has(data, "size") &&
    Reflect.has(data, "position") &&
    Reflect.has(data, "state")
  );
}
