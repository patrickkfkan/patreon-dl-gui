import type { Editor } from "./App";
import type { FileLoggerConfig } from "patreon-dl";
import type { FileConfig } from "./FileConfig";
import type { PageInfo, UIConfig, UIConfigSection } from "./UIConfig";
import type { DownloaderLogMessage } from "../core/DownloaderConsoleLogger";
import type { OpenDialogOptions } from "electron";
import type { RecentDocument } from "../core/util/RecentDocuments";

export type RendererEvent =
  | "editorCreated"
  | "closeEditorResult"
  | "openFileResult"
  | "browserPageInfo"
  | "fsChooserResult"
  | "previewInfo"
  | "previewEnd"
  | "promptOverwriteOnSave"
  | "saveResult"
  | "downloaderInit"
  | "downloaderStart"
  | "downloaderEnd"
  | "downloaderLogMessage"
  | "downloadProcessEnd"
  | "execUICommand"
  | "requestHelpResult"
  | "helpEnd"
  | "aboutInfo"
  | "aboutEnd"
  | "recentDocumentsInfo";

export type MainEvent =
  | "uiReady"
  | "openFSChooser"
  | "newEditor"
  | "closeEditor"
  | "preview"
  | "endPreview"
  | "openFile"
  | "save"
  | "confirmSave"
  | "saveAs"
  | "startDownload"
  | "promptStartDownloadResult"
  | "abortDownload"
  | "endDownloadProcess"
  | "modifiedEditorsInfo"
  | "activeEditorInfo"
  | "requestHelp"
  | "endHelp"
  | "requestAboutInfo"
  | "endAbout";

export type UICommand =
  | "createEditor"
  | "openFile"
  | "closeActiveEditor"
  | "preview"
  | "save"
  | "saveAs"
  | "startDownload"
  | "showHelpIcons"
  | "showAbout";

export interface AboutInfo {
  appName: string;
  appVersion: string;
  appURL: string;
}

export type FSChooserResult =
  | {
      canceled: true;
      filePath?: undefined;
    }
  | {
      canceled: false;
      filePath: string;
    };

export type CloseEditorResult =
  | {
      canceled: true;
      editor?: undefined;
    }
  | {
      canceled: false;
      editor: Editor;
    };

export type OpenFileResult =
  | {
      canceled: true;
      hasError?: undefined;
      editor?: undefined;
      isNewEditor?: undefined;
    }
  | {
      canceled?: undefined;
      hasError: true;
      editor?: undefined;
      isNewEditor?: undefined;
    }
  | {
      canceled?: undefined;
      hasError?: undefined;
      editor: Editor;
      isNewEditor: boolean;
    };

export type SaveFileConfigResult =
  | {
      canceled: true;
      hasError?: undefined;
      config?: undefined;
      error?: undefined;
    }
  | {
      canceled?: undefined;
      hasError?: undefined;
      config: FileConfig<"hasPath">;
      error?: undefined;
    }
  | {
      canceled?: undefined;
      hasError: true;
      config?: undefined;
      error: string;
    };

export type ConfirmSaveResult =
  | {
      confirmed: true;
      config: FileConfig<"hasPath">;
    }
  | {
      confirmed: false;
      config?: undefined;
    };

export type DownloaderInitInfo =
  | {
      hasError: true;
      error: string;
      downloaderConfig?: undefined;
      fileLoggerConfig?: undefined;
      prompt?: undefined;
    }
  | {
      hasError: false;
      error?: undefined;
      downloaderConfig: object;
      fileLoggerConfig: FileLoggerConfig;
      prompt: boolean;
    };

export type DownloaderEndInfo =
  | {
      hasError: true;
      error: string;
      aborted?: undefined;
    }
  | {
      hasError: false;
      error?: undefined;
      aborted: boolean;
    };

export interface PromptStartDownloadResult {
  confirmed: boolean;
}

export interface ModifiedEditorsInfo {
  editors: Editor[];
}

export interface ActiveEditorInfo {
  editor: Editor | null;
}

export interface RequestHelpResult {
  contents: string;
}

export interface RecentDocumentsInfo {
  entries: readonly RecentDocument[];
}

export type ExecUICommandParams<C extends UICommand> = C extends "showHelpIcons"
  ? Parameters<(show: boolean) => void>
  : C extends "openFile"
    ? Parameters<(filePath?: string) => void>
    : [];

export type RendererEventListener<E extends RendererEvent> =
  E extends "aboutInfo"
    ? (info: AboutInfo) => void
    : E extends "editorCreated"
      ? (editor: Editor) => void
      : E extends "closeEditorResult"
        ? (result: CloseEditorResult) => void
        : E extends "openFileResult"
          ? (result: OpenFileResult) => void
          : E extends "browserPageInfo"
            ? (info: PageInfo) => void
            : E extends "fsChooserResult"
              ? (result: FSChooserResult) => void
              : E extends "previewInfo"
                ? (info: FileConfig) => void
                : E extends "previewEnd"
                  ? () => void
                  : E extends "promptOverwriteOnSave"
                    ? (config: FileConfig<"hasPath">) => void
                    : E extends "saveResult"
                      ? (result: SaveFileConfigResult) => void
                      : E extends "downloaderInit"
                        ? (info: DownloaderInitInfo) => void
                        : E extends "downloaderStart"
                          ? () => void
                          : E extends "downloaderEnd"
                            ? (info: DownloaderEndInfo) => void
                            : E extends "downloaderLogMessage"
                              ? (message: DownloaderLogMessage) => void
                              : E extends "downloadProcessEnd"
                                ? () => void
                                : E extends "requestHelpResult"
                                  ? (result: RequestHelpResult) => void
                                  : E extends "helpEnd"
                                    ? () => void
                                    : E extends "aboutEnd"
                                      ? () => void
                                      : E extends "execUICommand"
                                        ? <C extends UICommand>(
                                            command: C,
                                            ...params: ExecUICommandParams<C>
                                          ) => void
                                        : E extends "recentDocumentsInfo"
                                          ? (info: RecentDocumentsInfo) => void
                                          : never;

export type MainEventListener<E extends MainEvent> = E extends "uiReady"
  ? () => void
  : E extends "openFSChooser"
    ? (dialogOptions: OpenDialogOptions) => void
    : E extends "newEditor"
      ? () => void
      : E extends "closeEditor"
        ? (editor: Editor) => void
        : E extends "preview"
          ? (editor: Editor) => void
          : E extends "endPreview"
            ? () => void
            : E extends "openFile"
              ? (currentEditors: Editor[], filePath?: string) => void
              : E extends "save"
                ? (editor: Editor) => void
                : E extends "confirmSave"
                  ? (result: ConfirmSaveResult) => void
                  : E extends "saveAs"
                    ? (editor: Editor) => void
                    : E extends "startDownload"
                      ? (editor: Editor) => void
                      : E extends "promptStartDownloadResult"
                        ? (result: PromptStartDownloadResult) => void
                        : E extends "abortDownload"
                          ? () => void
                          : E extends "endDownloadProcess"
                            ? () => void
                            : E extends "modifiedEditorsInfo"
                              ? (info: ModifiedEditorsInfo) => void
                              : E extends "activeEditorInfo"
                                ? (info: ActiveEditorInfo) => void
                                : E extends "requestHelp"
                                  ? <S extends UIConfigSection>(
                                      section: S,
                                      prop: keyof UIConfig[S]
                                    ) => void
                                  : E extends "endHelp"
                                    ? () => void
                                    : E extends "requestAboutInfo"
                                      ? () => void
                                      : E extends "endAbout"
                                        ? () => void
                                        : never;
