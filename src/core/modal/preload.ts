import { contextBridge } from "electron";
import RendererAPI from "../RendererAPI";

const mainAPI = new RendererAPI<"main">();

contextBridge.exposeInMainWorld("mainAPI", {
  on: mainAPI.on,
  emitMainEvent: mainAPI.emitMainEvent,
  invoke: mainAPI.invoke
});

declare global {
  interface Window {
    mainAPI: RendererAPI<"main">;
  }
}
