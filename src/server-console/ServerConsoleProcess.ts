import _ from "lodash";
import os from "os";
import { APP_DATA_PATH } from "../common/Constants";
import ProcessBase from "../common/ProcessBase";
import parseArgs from "yargs-parser";
import type { Server, ServerList, ServerListEntry } from "./types/Server";
import ServerConsoleWindow from "./ServerConsoleWindow";
import { getServers, saveServers } from "./config/Servers";
import { WebServer } from "patreon-dl";
import { dialog, Menu, shell } from "electron";
import type { SaveServerFormResult } from "./types/ServerConsoleInvocableMethods";
import path from "path";
import { loadLastWindowState, saveWindowState } from "../common/util/WindowState";
import { ensureAppDataPath, openFSChooser } from "../common/util/FS";
import { getStartableServerListEntryIds, getStoppableServerListEntryIds } from "./util/Server";

const processArgs = parseArgs(process.argv);

type LaunchServerFormParams = {
  onSave: (server: Server) => SaveServerFormResult;
} & ({
  mode: "add";
} | {
  mode: "edit";
  server: Server;
});

export default class ServerConsoleProcess extends ProcessBase<"serverConsole"> {
  protected win: ServerConsoleWindow;
  protected serverList: ServerList;
  #cleanupCallbacks: (() => void)[];
  #serverId: number;
  #promptDelete: boolean;

  constructor() {
    super();
    const devTools = Reflect.has(processArgs, "dev-tools");
    const lastWindowState = loadLastWindowState("serverConsole");
    this.win = new ServerConsoleWindow({
      devTools,
      ...lastWindowState
    });
    this.serverList = {
      entries: []
    };
    this.#cleanupCallbacks = [];
    this.#serverId = -1;
    this.#promptDelete = true;
  }

  protected setAppMenu() {
    Menu.setApplicationMenu(null);
  }

  protected registerEventListeners() {
    return [
      this.on("uiReady", () => {
        this.serverList = this.#getServerList();
        this.#emitServerListUpdate();
      })
    ];
  }

  async start() {
    ensureAppDataPath();
    this.setAppMenu();
    this.win.on("close", (e) => {
      this.end(e);
    });

    this.#cleanupCallbacks.push(
      ...this.registerEventListeners(),
      this.handle("startServer", (serverListEntryId) => {
        return this.startServer(serverListEntryId);
      }),
      this.handle("stopServer", (serverListEntryId) => {
        return this.stopServer(serverListEntryId);
      }),
      this.handle("addServer", () => {
        return this.addServer();
      }),
      this.handle("editServer", (serverListEntryId) => {
        return this.editServer(serverListEntryId);
      }),
      this.handle("deleteServer", (serverListEntryId) => {
        return this.deleteServer(serverListEntryId);
      }),
      this.handle("startAllServers", () => {
        return this.startAllServers();
      }),
      this.handle("stopAllServers", () => {
        return this.stopAllServers();
      }),
      this.handle("openFSChooser", async (options) =>
        openFSChooser(this.win, options)
      ),
      this.handle("openExternalBrowser", (url) => {
        return shell.openExternal(url);
      })
    );

    this.win.onServerConsoleWindowEvent("stateChange", (info) => {
      saveWindowState("serverConsole", info);
    });

    await this.win.launch();

    console.debug(
      `Server console running. App data path is "${APP_DATA_PATH}".`
    );
  }

  protected async addServer() {
    return await this.#openServerForm({
      mode: "add",
      onSave: (data) => {
        const newEntry: ServerListEntry = {
          id: this.#serverId++,
          server: data,
          status: "stopped"
        };
        this.serverList.entries.push(newEntry);
        this.#saveServers();
        this.#emitServerListUpdate();
        return {
          success: true
        };
      }
    });
  }

  protected async editServer(serverListEntryId: number) {
    const entryIndex = this.serverList.entries.findIndex(
      (entry) => entry.id === serverListEntryId
    );
    const entry = this.serverList.entries[entryIndex];
    if (!entry || entry.status === "running") {
      return;
    }
    return await this.#openServerForm({
      mode: "edit",
      server: entry.server,
      onSave: (data) => {
        this.serverList.entries[entryIndex] = {
          id: entry.id,
          server: data,
          status: "stopped"
        };
        this.#saveServers();
        this.#emitServerListUpdate();
        return {
          success: true
        };
      }
    });
  }

  async #openServerForm(params: LaunchServerFormParams) {
    const { mode, onSave } = params;
    const cleanupCallbacks: ReturnType<typeof this.handle>[] = [];
    switch (mode) {
      case "add":
        this.emitRendererEvent(this.win, "showAddServerForm");
        break;
      case "edit":
        this.emitRendererEvent(this.win, "showEditServerForm", params.server);
        break;
    }
    return await new Promise<void>((resolve) => {
      cleanupCallbacks.push(
        this.handle("saveServerFormData", (server) => {
          server.name = server.name.trim();
          server.dataDir = server.dataDir.trim();
          // Validate input
          const errors:(SaveServerFormResult & { success: false; })['errors'] = {};
          if (!server.name) {
            errors.name = "Server name is required";
          }
          if (!server.dataDir) {
            errors.dataDir = "Data directory must be specified";
          }
          if (isNaN(server.portNumber) || server.portNumber < 1024 || server.portNumber > 65535) {
            errors.portNumber = "Port number must be between 1024 and 65535 (inclusive)";
          }
          if (Object.keys(errors).length > 0) {
            return {
              success: false,
              errors
            };
          }
          const saveResult = onSave(server);
          if (saveResult.success) {
            resolve();
          }
          return saveResult;
        }),

        this.handle("cancelServerForm", () => {
          resolve();
        })
      );
    }).finally(() => {
      cleanupCallbacks.forEach((cb) => cb());
      this.emitRendererEvent(this.win, "closeServerForm");
    });
  }

  async startServer(serverListEntryId: number) {
    const [entry, entryIndex] = this.#findServerListEntry(serverListEntryId);
    if (!entry || entry.status !== "stopped") {
      return;
    }
    this.serverList.entries[entryIndex] = {
      id: entry.id,
      server: entry.server,
      status: "starting"
    };
    this.#emitServerListUpdate();
    const server = entry.server;
    const ws = new WebServer({
      dataDir: path.resolve(server.dataDir),
      port: server.port === "auto" ? null : server.portNumber
    });
    try {
      await ws.start();
      const port = ws.getConfig().port;
      const ip = this.#getLocalIPAddress();
      this.serverList.entries[entryIndex] = {
        id: entry.id,
        server: entry.server,
        status: "running",
        url: `http://${ip}:${port}`,
        instance: ws
      };
    } catch (error: unknown) {
      console.error("Server", server, "failed to start:", error);
      this.serverList.entries[entryIndex] = {
        id: entry.id,
        server: entry.server,
        status: "error",
        action: "start",
        message: error instanceof Error ? error.message : String(error)
      };
    } finally {
      this.#emitServerListUpdate();
    }
  }

  async stopServer(serverListEntryId: number) {
    const [entry, entryIndex] = this.#findServerListEntry(serverListEntryId);
    if (!entry || entry.status !== "running") {
      return;
    }
    this.serverList.entries[entryIndex] = {
      id: entry.id,
      server: entry.server,
      status: "stopping",
      instance: entry.instance
    };
    this.#emitServerListUpdate();
    try {
      await entry.instance.stop();
      this.serverList.entries[entryIndex] = {
        id: entry.id,
        server: entry.server,
        status: "stopped"
      };
    } catch (error: unknown) {
      console.error("Server", entry.server, "failed to stop:", error);
      this.serverList.entries[entryIndex] = {
        id: entry.id,
        server: entry.server,
        status: "error",
        action: "stop",
        message: error instanceof Error ? error.message : String(error)
      };
    } finally {
      this.#emitServerListUpdate();
    }
  }

  async deleteServer(serverListEntryId: number) {
    const [entry, entryIndex] = this.#findServerListEntry(serverListEntryId);
    if (!entry) {
      return;
    }
    if (this.#promptDelete) {
      const result = await dialog.showMessageBox(this.win, {
        type: 'warning',
        title: 'Delete server',
        message: `Are you sure you want to delete the server "${entry.server.name}"?`,
        buttons: ['Cancel', 'Delete'],
        cancelId: 0,
        defaultId: 1,
        checkboxLabel: "Don't ask me again",
        checkboxChecked: false
      });
      if (result.response === 0) {
        return;
      }
      this.#promptDelete = !result.checkboxChecked;
    }
    if (entry.status === "running") {
      await this.stopServer(serverListEntryId);
    }
    this.serverList.entries.splice(entryIndex, 1);
    this.#saveServers();
    this.#emitServerListUpdate();
  }

  async end(e?: Electron.Event) {
    e?.preventDefault();
    this.#cleanupCallbacks.forEach((cb) => cb());
    this.#cleanupCallbacks = [];
    await this.stopAllServers();
    await this.win.destroy();
  }

  async startAllServers() {
    await Promise.all(getStartableServerListEntryIds(this.serverList).map((id) => this.startServer(id)));
  }

  async stopAllServers() {
    await Promise.all((getStoppableServerListEntryIds(this.serverList)).map((id) => this.stopServer(id)));
  }

  #getServerList(): ServerList {
    const servers = getServers();
    const entries = servers.map<ServerListEntry>((server) => ({
      id: this.#serverId++,
      server,
      status: "stopped",
      selected: false
    }));
    return {
      entries
    };
  }

  #saveServers() {
    const servers = this.serverList.entries.map(({ server }) => server);
    saveServers(servers);
  }

  #findServerListEntry(
    serverListEntryId: number
  ): [ServerListEntry | undefined, number] {
    const entryIndex = this.serverList.entries.findIndex(
      (entry) => entry.id === serverListEntryId
    );
    const entry = this.serverList.entries[entryIndex];
    return [entry, entryIndex];
  }

  #emitServerListUpdate() {
    this.emitRendererEvent(this.win, "serverListUpdate", this.serverList);
  }

  #getLocalIPAddress(): string {
    const interfaces = os.networkInterfaces();

    for (const name of Object.keys(interfaces)) {
      const iface = interfaces[name];
      if (!iface) continue;

      for (const net of iface) {
        if (net.family === "IPv4" && !net.internal) {
          return net.address;
        }
      }
    }

    return "127.0.0.1";
  }
}
