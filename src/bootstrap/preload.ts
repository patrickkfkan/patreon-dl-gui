import { contextBridge } from "electron";
import RendererAPI from "../RendererAPI";

const bootstrapAPI = new RendererAPI<"bootstrap">();

contextBridge.exposeInMainWorld("bootstrapAPI", {
  on: bootstrapAPI.on,
  emitMainEvent: bootstrapAPI.emitMainEvent
});

declare global {
  interface Window {
    bootstrapAPI: RendererAPI<"bootstrap">;
  }
}
