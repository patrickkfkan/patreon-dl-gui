import type { IpcRendererEvent } from "electron";
import { ipcRenderer } from "electron";
import type {
  ProcessMainEvent,
  ProcessMainEventListener,
  ProcessRendererEvent,
  ProcessRendererEventListener,
  ProcessType
} from "./ProcessBase";

export default class RendererAPI<T extends ProcessType> {
  on<E extends ProcessRendererEvent<T>>(
    eventName: E,
    listener: ProcessRendererEventListener<T, E>,
    options?: { once?: boolean }
  ) {
    const internalListener = (
      _event: IpcRendererEvent,
      ...args: Parameters<ProcessRendererEventListener<T, E>>
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

  emitMainEvent<E extends ProcessMainEvent<T>>(
    eventName: E,
    ...args: Parameters<ProcessMainEventListener<T, E>>
  ) {
    ipcRenderer.send(eventName, ...args);
  }
}
