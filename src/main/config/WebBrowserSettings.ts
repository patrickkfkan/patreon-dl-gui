import path from 'path';
import fs from 'fs-extra';
import { APP_DATA_PATH } from '../../common/Constants';
import { DEFAULT_WEB_BROWSER_SETTINGS } from '../Constants';

const WEB_BROWSER_SETTINGS_PATH = path.join(APP_DATA_PATH, "/WebBrowserSettings.json");

export interface WebBrowserSettings {
  userAgent: string;
  // Clear session data (cookies, cache...) on closing the editor
  clearSessionDataOnExit: boolean;
}

export function getWebBrowseSettings(): WebBrowserSettings {
  if (!fs.existsSync(WEB_BROWSER_SETTINGS_PATH)) {
    return DEFAULT_WEB_BROWSER_SETTINGS;
  }
  try {
    const loaded = fs.readJSONSync(WEB_BROWSER_SETTINGS_PATH);
    return {
      ...DEFAULT_WEB_BROWSER_SETTINGS,
      ...loaded
    }
  }
  catch (error: unknown) {
    console.error(
      `Failed to read web browser settings from "${WEB_BROWSER_SETTINGS_PATH}"`,
      error instanceof Error ? error.message : String(error)
    );
    return DEFAULT_WEB_BROWSER_SETTINGS;
  }
}

export function saveWebBrowserSettings(settings: WebBrowserSettings) {
  try {
    return fs.writeJSONSync(WEB_BROWSER_SETTINGS_PATH, settings);
  }
  catch (error: unknown) {
    const err = error instanceof Error ? error.message : String(error);
    const message = `Failed to save web browser settings to "${WEB_BROWSER_SETTINGS_PATH}": ${err}`
    console.error(message);
    throw error;
  }
}