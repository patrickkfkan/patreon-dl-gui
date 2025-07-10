import type { BaseWindow} from "electron";
import type electron from "electron";
import { dialog } from "electron";
import fs from "fs";
import { APP_DATA_PATH } from "../Constants";

export type FSChooserResult =
  | {
      canceled: true;
    }
  | {
      canceled: false;
      filePath: string;
    };

export async function openFSChooser(win: BaseWindow, options: electron.OpenDialogOptions): Promise<FSChooserResult> {
  const result = await dialog.showOpenDialog(win, options);
  if (result.canceled) {
    return {
      canceled: true
    };
  } else {
    return {
      canceled: false,
      filePath: result.filePaths[0]
    };
  }
}

export function ensureAppDataPath() {
  if (!fs.existsSync(APP_DATA_PATH)) {
    try {
      fs.mkdirSync(APP_DATA_PATH, {
        recursive: true
      });
    } catch (error: unknown) {
      console.error(
        `Failed to create app data path "${APP_DATA_PATH}":`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }
}