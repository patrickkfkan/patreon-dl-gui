import type { OpenDialogOptions } from "electron";
import { Server } from "./Server";
import type { FSChooserResult } from "../../common/util/FS";

export type ServerConsoleInvocableMethod =
  | "selectServerListEntry"
  | "openFSChooser"
  | "addServer"
  | "editServer"
  | "saveServerFormData"
  | "cancelServerForm"
  | "deleteServer"
  | "startServer"
  | "stopServer"
  | "startAllServers"
  | "stopAllServers"
  | "openExternalBrowser";

export type SaveServerFormResult = {
  success: true;
} | {
  success: false;
  errors: Partial<Record<keyof Server, string>>;
}

export type ServerConsoleInvocableMethodHandler<
  M extends ServerConsoleInvocableMethod
> =
  M extends "openFSChooser" ?
    (dialogOptions: OpenDialogOptions) => Promise<FSChooserResult>
  : M extends "showServerForm" ? (mode: "add" | "edit") => void
  : M extends "addServer" ? () => void
  : M extends "editServer" ? (serverListEntryId: number) => void
  : M extends "saveServerFormData" ? (server: Server) => SaveServerFormResult
  : M extends "cancelServerForm" ? () => void
  : M extends "deleteServer" ? (serverListEntryId: number) => void
  : M extends "startServer" ? (serverListEntryId: number) => void
  : M extends "stopServer" ? (serverListEntryId: number) => void
  : M extends "startAllServers" ? () => void
  : M extends "stopAllServers" ? () => void
  : M extends "openExternalBrowser" ? (url: string) => void
  : never;
