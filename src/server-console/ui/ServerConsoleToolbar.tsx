import { Navbar } from "react-bootstrap";
import { useCallback, useEffect, useState } from "react";
import ToolbarButton from "../../common/ui/components/ToolbarButton";
import type { ServerList } from "../types/Server";
import {
  getStartableServerListEntryIds,
  getStoppableServerListEntryIds
} from "../util/Server";

function ServerConsoleToolbar() {
  const [serverList, setServerList] = useState<ServerList | null>(null);

  useEffect(() => {
    const removeListenerCallbacks = [
      window.serverConsoleAPI.on("serverListUpdate", (list) => {
        setServerList(list);
      })
    ];

    return () => {
      removeListenerCallbacks.forEach((cb) => cb());
    };
  }, []);

  const addServer = useCallback(async () => {
    await window.serverConsoleAPI.invoke("addServer");
  }, []);

  const startAllServers = useCallback(async () => {
    await window.serverConsoleAPI.invoke("startAllServers");
  }, []);

  const stopAllServers = useCallback(async () => {
    await window.serverConsoleAPI.invoke("stopAllServers");
  }, []);

  if (!serverList) {
    return null;
  }

  const startAllButton =
    getStartableServerListEntryIds(serverList).length > 0 ?
      <ToolbarButton
        icon="play_arrow"
        label="Start all"
        onClick={startAllServers}
      />
    : null;
  const stopAllButton =
    getStoppableServerListEntryIds(serverList).length > 0 ?
      <ToolbarButton icon="stop" label="Stop all" onClick={stopAllServers} />
    : null;

  return (
    <Navbar bg="primary" sticky="top" style={{ height: "3rem" }}>
      <ToolbarButton icon="add" label="Add" onClick={addServer} />
      {startAllButton}
      {stopAllButton}
    </Navbar>
  );
}

export default ServerConsoleToolbar;
