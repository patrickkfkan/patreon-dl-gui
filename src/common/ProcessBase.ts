import type {
  BrowserWindow,
  IpcMainEvent,
  IpcMainInvokeEvent,
  WebContentsView
} from "electron";
import { ipcMain } from "electron";
import type {
  MainProcessMainEvent,
  MainProcessMainEventListener,
  MainProcessRendererEvent,
  MainProcessRendererEventListener
} from "../main/types/MainEvents";
import type {
  MainProcessInvocableMethod,
  MainProcessInvocableMethodHandler
} from "../main/types/MainInvocableMethods";
import type { ServerConsoleMainEvent, ServerConsoleMainEventListener, ServerConsoleRendererEvent, ServerConsoleRendererEventListener } from "../server-console/types/ServerConsoleEvents";
import type { ServerConsoleInvocableMethod, ServerConsoleInvocableMethodHandler } from "../server-console/types/ServerConsoleInvocableMethods";

export type ProcessType = "main" | "serverConsole";

export type ProcessRendererEvent<T extends ProcessType> =
  T extends "main" ? MainProcessRendererEvent
  : T extends "serverConsole" ? ServerConsoleRendererEvent
  : never;

export type ProcessMainEvent<T extends ProcessType> =
  T extends "main" ? MainProcessMainEvent
  : T extends "serverConsole" ? ServerConsoleMainEvent
  : never;

export type ProcessRendererEventListener<
  T extends ProcessType,
  E extends ProcessRendererEvent<T>
> =
  E extends MainProcessRendererEvent ? MainProcessRendererEventListener<E>
  : E extends ServerConsoleRendererEvent ? ServerConsoleRendererEventListener<E>
  : never;

export type ProcessMainEventListener<
  T extends ProcessType,
  E extends ProcessMainEvent<T>
> =
  E extends MainProcessMainEvent ? MainProcessMainEventListener<E>
  : E extends ServerConsoleMainEvent ? ServerConsoleMainEventListener<E>
  : never;

export type ProcessInvocableMethod<T extends ProcessType> =
  T extends "main" ? MainProcessInvocableMethod
  : T extends "serverConsole" ? ServerConsoleInvocableMethod
  : never;

export type ProcessInvocableMethodHandler<
  T extends ProcessType,
  M extends ProcessInvocableMethod<T>
> =
  M extends MainProcessInvocableMethod ? MainProcessInvocableMethodHandler<M>
  : M extends ServerConsoleInvocableMethod ? ServerConsoleInvocableMethodHandler<M>
  : never;

export default abstract class ProcessBase<T extends ProcessType> {
  protected emitRendererEvent<E extends ProcessRendererEvent<T>>(
    win: BrowserWindow | WebContentsView,
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

  handle<M extends ProcessInvocableMethod<T>>(
    methodName: M,
    handler: ProcessInvocableMethodHandler<T, M>
  ) {
    const internalHandler = (
      _event: IpcMainInvokeEvent,
      ...args: Parameters<ProcessInvocableMethodHandler<T, M>>
    ) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (handler as any)(...args);
    };
    ipcMain.handle(methodName, internalHandler);
    return () => {
      ipcMain.removeHandler(methodName);
    };
  }
}
