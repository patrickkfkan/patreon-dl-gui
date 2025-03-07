import { BrowserWindow, ipcMain, IpcMainEvent } from "electron";
import {
  BootstrapProcessMainEvent,
  BootstrapProcessMainEventListener,
  BootstrapProcessRendererEvent,
  BootstrapProcessRendererEventListener
} from "./types/BootstrapEvents";
import {
  MainProcessMainEvent,
  MainProcessMainEventListener,
  MainProcessRendererEvent,
  MainProcessRendererEventListener
} from "./types/MainEvents";

export type ProcessType = "bootstrap" | "main";

export type ProcessRendererEvent<T extends ProcessType> = T extends "bootstrap"
  ? BootstrapProcessRendererEvent
  : T extends "main"
    ? MainProcessRendererEvent
    : never;

export type ProcessMainEvent<T extends ProcessType> = T extends "bootstrap"
  ? BootstrapProcessMainEvent
  : T extends "main"
    ? MainProcessMainEvent
    : never;

export type ProcessRendererEventListener<
  T extends ProcessType,
  E extends ProcessRendererEvent<T>
> = E extends BootstrapProcessRendererEvent
  ? BootstrapProcessRendererEventListener<E>
  : E extends MainProcessRendererEvent
    ? MainProcessRendererEventListener<E>
    : never;

export type ProcessMainEventListener<
  T extends ProcessType,
  E extends ProcessMainEvent<T>
> = E extends BootstrapProcessMainEvent
  ? BootstrapProcessMainEventListener<E>
  : E extends MainProcessMainEvent
    ? MainProcessMainEventListener<E>
    : never;

export default abstract class ProcessBase<T extends ProcessType> {
  protected emitRendererEvent<E extends ProcessRendererEvent<T>>(
    win: BrowserWindow,
    eventName: E,
    ...args: Parameters<ProcessRendererEventListener<T, E>>
  ) {
    win.webContents.send(eventName, ...args);
  }

  on<E extends ProcessMainEvent<T>>(
    eventName: E,
    listener: ProcessMainEventListener<T, E>,
    options?: { once?: boolean }
  ): () => void {
    const internalListener = (
      _event: IpcMainEvent,
      ...args: Parameters<ProcessMainEventListener<T, E>>
    ) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (listener as any)(...args);
    };
    const once = options?.once ?? false;
    if (once) {
      ipcMain.once(eventName, internalListener);
    } else {
      ipcMain.on(eventName, internalListener);
    }
    return () => {
      ipcMain.off(eventName, internalListener);
    };
  }
}
