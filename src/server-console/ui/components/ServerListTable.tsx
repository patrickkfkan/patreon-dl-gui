import "react-data-grid/lib/styles.css";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ServerList, ServerListEntry } from "../../types/Server";
import { Button, ButtonProps, Stack } from "react-bootstrap";
import { DataGrid, SortColumn, type Column } from "react-data-grid";
import { ServerConsoleInvocableMethod } from "../../types/ServerConsoleInvocableMethods";
import ServerErrorModal, { ServerErrorModalProps } from "./ServerErrorModal";

interface ServerActionButtonProps {
  entry: ServerListEntry;
  icon: string;
  title: string;
  invoke: ServerConsoleInvocableMethod;
  variant?: ButtonProps["variant"];
}

interface Row {
  id: number;
  name: string;
  dataDir: string;
  status: ServerListEntry["status"];
  statusEl: React.ReactNode;
  actionEl: React.ReactNode;
}

type ErrorModalData = Pick<ServerErrorModalProps, "serverListEntry" | "show">;

function rowKeyGetter(row: Row) {
  return row.id;
}

function ServerActionButton({
  entry,
  icon,
  title,
  invoke,
  variant
}: ServerActionButtonProps) {
  return (
    <Button
      variant={variant || "primary"}
      size="sm"
      className="d-flex align-items-center justify-content-center"
      style={{ height: "1.5rem", width: "1.5rem" }}
      title={title}
      onClick={async () => {
        await window.serverConsoleAPI.invoke(invoke, entry.id);
      }}
    >
      <span
        className="material-icons"
        style={{ fontSize: "1rem", lineHeight: "inherit" }}
      >
        {icon}
      </span>
    </Button>
  );
}

async function openExternalBrowser(url?: string) {
  if (url) {
    await window.serverConsoleAPI.invoke("openExternalBrowser", url);
  }
}

function getColumns(entries: ServerListEntry[]): Column<Row>[] {
  let statusColumnMinWidth = 100;
  if (
    entries.some(
      (entry) => entry.status === "running" || entry.status === "error"
    )
  ) {
    statusColumnMinWidth = 280;
  }
  return [
    { key: "name", name: "Server", sortable: true, editable: false },
    { key: "dataDir", name: "Data directory", editable: false },
    {
      key: "statusEl",
      name: "Status",
      minWidth: statusColumnMinWidth,
      sortable: true,
      editable: false
    },
    { key: "actionEl", name: "Action", editable: false, resizable: false }
  ];
}

function getActionEl(entry: ServerListEntry) {
  const predefined: Record<string, ServerActionButtonProps> = {
    start: {
      entry,
      icon: "play_arrow",
      title: "Start",
      invoke: "startServer"
    },
    stop: {
      entry,
      icon: "stop",
      title: "Stop",
      invoke: "stopServer"
    },
    edit: {
      entry,
      icon: "edit",
      title: "Edit",
      invoke: "editServer"
    },
    delete: {
      entry,
      icon: "delete",
      title: "Delete",
      invoke: "deleteServer"
    }
  };
  const actionButtons: React.ReactNode[] = [];
  switch (entry.status) {
    case "stopped": {
      actionButtons.push(
        <ServerActionButton
          key={`erver-action-start-${entry.id}`}
          {...predefined.start}
        />,
        <ServerActionButton
          key={`erver-action-edit-${entry.id}`}
          {...predefined.edit}
        />
      );
      break;
    }
    case "error": {
      switch (entry.action) {
        case "start":
          actionButtons.push(
            <ServerActionButton
              key={`erver-action-start-${entry.id}`}
              {...predefined.start}
            />,
            <ServerActionButton
              key={`erver-action-edit-${entry.id}`}
              {...predefined.edit}
            />
          );
          break;
        case "stop":
          actionButtons.push(
            <ServerActionButton
              key={`erver-action-stop-${entry.id}`}
              {...predefined.stop}
            />
          );
          break;
      }
      break;
    }
    case "running": {
      actionButtons.push(
        <ServerActionButton
          key={`erver-action-stop-${entry.id}`}
          {...predefined.stop}
        />
      );
      break;
    }
  }
  actionButtons.push(
    <ServerActionButton
      key={`erver-action-delete-${entry.id}`}
      {...predefined.delete}
    />
  );
  return actionButtons.length > 0 ?
      <Stack direction="horizontal" gap={1}>
        {actionButtons}
      </Stack>
    : null;
}

function getStatusEl(
  entry: ServerListEntry,
  showErrorModalFn: (entry: ServerListEntry & { status: "error" }) => void
) {
  let statusEl: React.ReactNode;
  switch (entry.status) {
    case "stopped": {
      statusEl = <span>Stopped</span>;
      break;
    }
    case "error": {
      statusEl = (
        <Stack direction="horizontal" className="text-danger" gap={2}>
          <span>Failed to {entry.action}.</span>
          <a
            href="#"
            className="link-info"
            onClick={() => showErrorModalFn(entry)}
          >
            More info
          </a>
        </Stack>
      );
      break;
    }
    case "running": {
      statusEl = (
        <Stack direction="horizontal" gap={2}>
          <span>Running:</span>
          <a
            href="#"
            onClick={() => {
              openExternalBrowser(entry.url);
            }}
          >
            {entry.url}
          </a>
        </Stack>
      );
      break;
    }
    case "starting": {
      statusEl = <span>Starting...</span>;
      break;
    }
    case "stopping": {
      statusEl = <span>Stopping...</span>;
      break;
    }
  }
  return statusEl;
}

function ServerListTable() {
  const [serverList, setServerList] = useState<ServerList | null>(null);
  const [sortColumns, setSortColumns] = useState<readonly SortColumn[]>([]);
  const [errorModalData, setErrorModalData] = useState<ErrorModalData | null>(
    null
  );

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

  const showErrorModal = useCallback(
    (entry: ServerListEntry & { status: "error" }) => {
      setErrorModalData({ serverListEntry: entry, show: true });
    },
    []
  );

  const handleErrorModalClose = useCallback(() => {
    setErrorModalData(null);
  }, []);

  const rows = useMemo(
    () =>
      serverList ?
        serverList.entries.map<Row>((entry) => ({
          id: entry.id,
          name: entry.server.name,
          dataDir: entry.server.dataDir,
          status: entry.status,
          statusEl: getStatusEl(entry, showErrorModal),
          actionEl: getActionEl(entry)
        }))
      : [],
    [serverList, showErrorModal]
  );

  const sortedRows = useMemo(() => {
    if (rows.length === 0 || sortColumns.length === 0) return rows;

    return [...rows].sort((a, b) => {
      for (const sort of sortColumns) {
        const { columnKey, direction } = sort;
        let _columnKey;
        switch (columnKey) {
          case "name":
            _columnKey = "name" as const;
            break;
          case "statusEl":
            _columnKey = "status" as const;
            break;
          default:
            _columnKey = null;
        }
        if (!_columnKey) continue;
        const aVal = a[_columnKey];
        const bVal = b[_columnKey];
        if (aVal === bVal) continue;
        const sortFactor = direction === "ASC" ? 1 : -1;
        return aVal > bVal ? sortFactor : -sortFactor;
      }
      return 0;
    });
  }, [rows, sortColumns]);

  const columns = useMemo(() => {
    if (!serverList) {
      return [];
    }
    return getColumns(serverList.entries);
  }, [serverList]);

  const noRowsEl = useMemo(
    () => (
      <div className="p-4" style={{ textAlign: "center", gridColumn: "1/-1" }}>
        No servers configured
      </div>
    ),
    []
  );

  if (!serverList) {
    return null;
  }

  return (
    <>
      <DataGrid
        className="server-list-table w-100 flex-fill"
        defaultColumnOptions={{
          resizable: true
        }}
        columns={columns}
        rows={sortedRows}
        rowKeyGetter={rowKeyGetter}
        sortColumns={sortColumns}
        onSortColumnsChange={setSortColumns}
        renderers={{
          noRowsFallback: noRowsEl
        }}
      />
      {errorModalData ?
        <ServerErrorModal {...errorModalData} onClose={handleErrorModalClose} />
      : null}
    </>
  );
}

export default ServerListTable;
