import type {
  MainEvent,
  MainEventListener,
  RendererEvent,
  RendererEventListener
} from "./types/Events";
import type { IpcRendererEvent } from "electron";
import { contextBridge, ipcRenderer } from "electron";

const electronAPI = {
  on: onRendererEvent,
  emitMainEvent: emitMainEvent
};

contextBridge.exposeInMainWorld("electronAPI", electronAPI);

function onRendererEvent<E extends RendererEvent>(
  eventName: E,
  listener: RendererEventListener<E>,
  options?: { once?: boolean }
) {
  const internalListener = (
    _event: IpcRendererEvent,
    ...args: Parameters<RendererEventListener<E>>
  ) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    listener(...(args as [any]));
  };
  const once = options?.once ?? false;
  if (once) {
    ipcRenderer.once(eventName, internalListener);
  } else {
    ipcRenderer.on(eventName, internalListener);
  }
  return () => {
    ipcRenderer.off(eventName, internalListener);
  };
}

function emitMainEvent<E extends MainEvent>(
  eventName: E,
  ...args: Parameters<MainEventListener<E>>
) {
  ipcRenderer.send(eventName, ...args);
}

declare global {
  interface Window {
    electronAPI: typeof electronAPI;
  }
}
