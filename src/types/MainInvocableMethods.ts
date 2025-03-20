import { Editor } from "./App";

export type MainProcessInvocableMethod = "getEditorPanelWidth" | "applyProxy";

export type MainProcessInvocableMethodHandler<
  M extends MainProcessInvocableMethod
> =
  M extends "getEditorPanelWidth" ? () => number
  : M extends "applyProxy" ? (editor: Editor) => void
  : never;
