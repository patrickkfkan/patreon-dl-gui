import { Server, ServerList } from "./Server";

export type ServerConsoleRendererEvent =
  | "serverListUpdate"
  | "showAddServerForm"
  | "showEditServerForm"
  | "closeServerForm";

export type ServerConsoleMainEvent =
  | "uiReady";

export type ServerConsoleRendererEventListener<
  E extends ServerConsoleRendererEvent
> =
  E extends "serverListUpdate" ? (list: ServerList) => void
  : E extends "showAddServerForm" ? () => void
  : E extends "showEditServerForm" ? (server: Server) => void
  : E extends "closeServerForm" ? () => void
  : never;

export type ServerConsoleMainEventListener<E extends ServerConsoleMainEvent> =
  E extends "uiReady" ? () => void
  : never;
