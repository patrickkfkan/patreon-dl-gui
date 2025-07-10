import { contextBridge } from "electron";
import RendererAPI from "../common/RendererAPI";

const serverConsoleAPI = new RendererAPI<"serverConsole">();

contextBridge.exposeInMainWorld("serverConsoleAPI", {
  on: serverConsoleAPI.on,
  emitMainEvent: serverConsoleAPI.emitMainEvent,
  invoke: serverConsoleAPI.invoke
});

declare global {
  interface Window {
    serverConsoleAPI: RendererAPI<"serverConsole">;
  }
}
