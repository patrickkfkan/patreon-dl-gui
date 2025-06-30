import type { OpenDialogOptions } from "electron";
import type { Editor } from "./App";
import type { UIConfig, UIConfigSection } from "./UIConfig";
import type { SaveFileConfigResult } from "./MainEvents";
import { WebBrowserSettings } from "../config/WebBrowserSettings";

export type MainProcessInvocableMethod =
  | "getEditorPanelWidth"
  | "newEditor"
  | "closeEditor"
  | "openFile"
  | "save"
  | "saveAs"
  | "preview"
  | "openFSChooser"
  | "applyProxy"
  | "requestHelp"
  | "requestAboutInfo"
  | "openExternalBrowser"
  | "setWebBrowserURL"
  | "setWebBrowserURLToHome"
  | "webBrowserBack"
  | "webBrowserForward"
  | "startDownload"
  | "abortDownload"
  | "configureYouTube"
  | "startYouTubeConnect"
  | "cancelYouTubeConnect"
  | "disconnectYouTube"
  | "requestWebBrowserSettings"
  | "saveWebBrowserSettings"
  | "clearSessionData";

export type MainProcessInvocableMethodHandler<
  M extends MainProcessInvocableMethod
> =
  M extends "getEditorPanelWidth" ? () => number
  : M extends "newEditor" ? () => void
  : M extends "closeEditor" ? (editor: Editor) => Promise<CloseEditorResult>
  : M extends "openFile" ?
    (currentEditors: Editor[], filePath?: string) => Promise<OpenFileResult>
  : M extends "save" ? (editor: Editor) => Promise<SaveFileConfigResult>
  : M extends "saveAs" ? (editor: Editor) => Promise<SaveFileConfigResult>
  : M extends "preview" ? (editor: Editor) => void
  : M extends "openFSChooser" ?
    (dialogOptions: OpenDialogOptions) => Promise<FSChooserResult>
  : M extends "applyProxy" ? (editor: Editor) => void
  : M extends "requestHelp" ?
    <S extends UIConfigSection>(section: S, prop: keyof UIConfig[S]) => void
  : M extends "requestAboutInfo" ? () => void
  : M extends "openExternalBrowser" ? (url: string) => void
  : M extends "setWebBrowserURL" ? (url: string) => void
  : M extends "setWebBrowserURLToHome" ? () => void
  : M extends "webBrowserBack" ? () => void
  : M extends "webBrowserForward" ? () => void
  : M extends "startDownload" ? (editor: Editor) => void
  : M extends "abortDownload" ? () => void
  : M extends "configureYouTube" ? () => void
  : M extends "startYouTubeConnect" ? () => void
  : M extends "cancelYouTubeConnect" ? () => void
  : M extends "disconnectYouTube" ? () => void
  : M extends "requestWebBrowserSettings" ? () => void
  : M extends "saveWebBrowserSettings" ? (settings: WebBrowserSettings) => Promise<void>
  : M extends "clearSessionData" ? () => void
  : never;

export type CloseEditorResult =
  | {
      canceled: true;
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

export type FSChooserResult =
  | {
      canceled: true;
    }
  | {
      canceled: false;
      filePath: string;
    };
