import path from "path";
import { APP_DATA_PATH } from "../../common/Constants";
import { convertUIConfigToFileContentsString, saveFileConfig } from "./FileConfig";
import type { UIConfig } from "../types/UIConfig";
import { existsSync, unlinkSync } from "fs";
import { getErrorString } from "../../common/util/Misc";
import { loadUIConfigFromFile } from "./FileLoader";

export const DEFAULT_CONFIG_PATH = path.join(
  APP_DATA_PATH,
  "Default.conf"
);

export function saveDefaultConfig(
  config: UIConfig,
  extra: { userAgent: string }
) {
  const contents = convertUIConfigToFileContentsString(config, extra);
  return saveFileConfig({
    contents,
    filePath: DEFAULT_CONFIG_PATH,
    name: 'Default.conf',
    editorId: -1
  });
}

export function resetDefaultConfig() {
  if (existsSync(DEFAULT_CONFIG_PATH)) {
    unlinkSync(DEFAULT_CONFIG_PATH);
  }
}

export function loadDefaultConfig() {
  if (!existsSync(DEFAULT_CONFIG_PATH)) {
    return null;
  }
  try {
    return loadUIConfigFromFile(DEFAULT_CONFIG_PATH);
  } catch (error: unknown) {
    console.error(
      `Failed to load default config from "${DEFAULT_CONFIG_PATH}":`,
      getErrorString(error)
    );
    return null;
  }
}