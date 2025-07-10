import fs from "fs-extra";
import path from "path";
import { APP_DATA_PATH } from "../../common/Constants";
import type { Server } from "../types/Server";

const SERVERS_FILE_PATH = path.join(APP_DATA_PATH, "/Servers.json");

export function getServers(): Server[] {
  try {
    if (!fs.existsSync(SERVERS_FILE_PATH)) {
      return [];
    } else {
      const data = fs.readJSONSync(SERVERS_FILE_PATH);
      if (
        data &&
        Array.isArray(data)
      ) {
        return data.reduce<Server[]>((result, entry, index) => {
          if (isServer(entry)) {
            result.push(entry);
          }
          else {
            console.warn(
              `Entry #${index} in servers file contains invalid data`
            );
          }
          return result;
        }, []);
      } else {
        console.warn(
          "Servers file contains data that has unexpected data structure."
        );
        return [];
      }
    }
  } catch (error: unknown) {
    console.error(
      "Failed to read servers file:",
      error instanceof Error ? error.message : String(error)
    );
    return [];
  }
}

export function saveServers(servers: Server[]) {
  try {
    fs.writeJSONSync(SERVERS_FILE_PATH, servers);
  }
  catch (error: unknown) {
    console.error(
      "Failed to write to servers file:",
      error instanceof Error ? error.message : String(error)
    );
  }
}

function isServer(data: unknown): data is Server {
  if (!data || typeof data !== 'object') {
    return false;
  }
  return (
    Reflect.has(data, 'name') &&
    Reflect.has(data, 'dataDir') &&
    Reflect.has(data, 'port') &&
    ['auto', 'manual'].includes(Reflect.get(data, 'port')) &&
    Reflect.has(data, 'portNumber') && 
    typeof Reflect.get(data, 'portNumber') === 'number'
  );
}