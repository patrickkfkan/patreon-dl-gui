import type { Editor } from "./App";
import type { FileLoggerConfig } from "patreon-dl";
import type { FileConfig } from "./FileConfig";
import type { PageInfo } from "./UIConfig";
import type { DownloaderLogMessage } from "../core/DownloaderConsoleLogger";
import type { RecentDocument } from "../core/util/RecentDocuments";
import type { ApplyProxyResult } from "../core/MainWindow";
import type {
  YouTubeConnectionStatus,
  YouTubeConnectResult,
  YouTubeConnectVerificationInfo
} from "../core/util/YouTubeConfigurator";

export type MainProcessRendererEvent =
  | "editorCreated"
  | "youtubeConnectionStatus"
  | "browserPageInfo"
  | "previewInfo"
  | "promptOverwriteOnSave"
  | "downloaderInit"
  | "downloaderStart"
  | "downloaderEnd"
  | "downloaderLogMessage"
  | "execUICommand"
  | "requestHelpResult"
  | "aboutInfo"
  | "recentDocumentsInfo"
  | "browserPageNavigated"
  | "applyProxyResult"
  | "youtubeConfiguratorStart"
  | "youtubeConnectVerificationInfo"
  | "youtubeConnectResult";

export type MainProcessMainEvent =
  | "uiReady"
  | "viewBoundsChange"
  | "activeEditorChange"
  | "confirmSave"
  | "confirmSaveModalClose"
  | "modifiedEditorsChange"
  | "previewModalClose"
  | "helpModalClose"
  | "aboutModalClose"
  | "confirmStartDownload"
  | "downloaderModalClose"
  | "youtubeConfiguratorModalClose";

export type UICommand =
  | "createEditor"
  | "openFile"
  | "closeActiveEditor"
  | "preview"
  | "save"
  | "saveAs"
  | "startDownload"
  | "showHelpIcons"
  | "showAbout"
  | "configureYouTube";

export interface AboutInfo {
  appName: string;
  appVersion: string;
  appURL: string;
}

export interface ActiveEditorInfo {
  editor: Editor | null;
}

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

export interface ConfirmStartDownloadResult {
  confirmed: boolean;
}

export interface ModifiedEditorsInfo {
  editors: Editor[];
}

export interface RequestHelpResult {
  contents: string;
}

export interface RecentDocumentsInfo {
  entries: readonly RecentDocument[];
}

export type ExecUICommandParams<C extends UICommand> =
  C extends "showHelpIcons" ? Parameters<(show: boolean) => void>
  : C extends "openFile" ? Parameters<(filePath?: string) => void>
  : [];

export interface WebBrowserPageNavigatedInfo {
  url: string;
  canGoForward: boolean;
  canGoBack: boolean;
}

export interface ViewBounds {
  editorView: Electron.Rectangle;
  webBrowserView: Electron.Rectangle;
}

export type MainProcessRendererEventListener<
  E extends MainProcessRendererEvent
> =
  E extends "aboutInfo" ? (info: AboutInfo) => void
  : E extends "editorCreated" ? (editor: Editor) => void
  : E extends "youtubeConnectionStatus" ?
    (status: YouTubeConnectionStatus) => void
  : E extends "browserPageInfo" ? (info: PageInfo) => void
  : E extends "previewInfo" ? (info: FileConfig) => void
  : E extends "promptOverwriteOnSave" ? (config: FileConfig<"hasPath">) => void
  : E extends "downloaderInit" ? (info: DownloaderInitInfo) => void
  : E extends "downloaderStart" ? () => void
  : E extends "downloaderEnd" ? (info: DownloaderEndInfo) => void
  : E extends "downloaderLogMessage" ? (message: DownloaderLogMessage) => void
  : E extends "requestHelpResult" ? (result: RequestHelpResult) => void
  : E extends "execUICommand" ?
    <C extends UICommand>(command: C, ...params: ExecUICommandParams<C>) => void
  : E extends "recentDocumentsInfo" ? (info: RecentDocumentsInfo) => void
  : E extends "browserPageNavigated" ?
    (info: WebBrowserPageNavigatedInfo) => void
  : E extends "applyProxyResult" ? (result: ApplyProxyResult) => void
  : E extends "youtubeConfiguratorStart" ?
    (status: YouTubeConnectionStatus) => void
  : E extends "youtubeConnectVerificationInfo" ?
    (info: YouTubeConnectVerificationInfo) => void
  : E extends "youtubeConnectResult" ? (result: YouTubeConnectResult) => void
  : never;

export type MainProcessMainEventListener<E extends MainProcessMainEvent> =
  E extends "uiReady" ? () => void
  : E extends "viewBoundsChange" ? (bounds: ViewBounds) => void
  : E extends "activeEditorChange" ? (info: ActiveEditorInfo) => void
  : E extends "confirmSave" ? (result: ConfirmSaveResult) => void
  : E extends "confirmSaveModalClose" ? () => void
  : E extends "modifiedEditorsChange" ? (info: ModifiedEditorsInfo) => void
  : E extends "previewModalClose" ? () => void
  : E extends "helpModalClose" ? () => void
  : E extends "aboutModalClose" ? () => void
  : E extends "confirmStartDownload" ?
    (result: ConfirmStartDownloadResult) => void
  : E extends "downloaderModalClose" ? () => void
  : E extends "youtubeConfiguratorModalClose" ? () => void
  : never;
