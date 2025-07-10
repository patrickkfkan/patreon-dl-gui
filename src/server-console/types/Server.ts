import type { WebServer } from "patreon-dl";

export interface Server {
  name: string;
  dataDir: string;
  port: "auto" | "manual";
  portNumber: number;
}

export type ServerListEntry = {
  id: number;
  server: Server;
} & (
  | {
      status: "starting";
    }
  | {
      status: "running";
      url: string;
      instance: WebServer;
    }
  | {
      status: "stopping";
      instance: WebServer;
    }
  | {
      status: "stopped";
    }
  | {
      status: "error";
      action: "start" | "stop";
      message: string;
    }
);

export interface ServerList {
  entries: ServerListEntry[];
}
