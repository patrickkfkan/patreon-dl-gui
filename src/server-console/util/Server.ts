import { ServerList } from "../types/Server";

export function getStartableServerListEntryIds(list: ServerList) {
  return list.entries
    .filter((entry) => entry.status === "stopped" || (entry.status === "error" && entry.action === "start"))
    .map((entry) => entry.id);
}

export function getStoppableServerListEntryIds(list: ServerList) {
  return list.entries
    .filter((entry) => entry.status === "running" || (entry.status === "error" && entry.action === "stop"))
    .map((entry) => entry.id);
}