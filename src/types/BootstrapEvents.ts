export type BootstrapProcessRendererEvent =
  | "promptInstallDependencies"
  | "installDependencyProgress"
  | "bootstrapError"
  | "bootstrapEnd";

export type BootstrapProcessMainEvent =
  | "uiReady"
  | "confirmInstallDependencies"
  | "exit";

export interface ConfirmInstallDependenciesResult {
  confirmed: boolean;
}

export interface Dependency {
  name: string;
  version: string;
}

export type DependencyInstallProgress = {
  dependency: Dependency;
} & (
  | {
      status: "downloading";
      downloadProgress: number | null;
    }
  | {
      status: "unpacking";
      downloadProgress?: undefined;
    }
);

export type BootstrapProcessRendererEventListener<
  E extends BootstrapProcessRendererEvent
> = E extends "promptInstallDependencies"
  ? (dependencies: Dependency[]) => void
  : E extends "installDependencyProgress"
    ? (progress: DependencyInstallProgress) => void
    : E extends "bootstrapError"
      ? (error: string) => void
      : E extends "bootstrapEnd"
        ? () => void
        : never;

export type BootstrapProcessMainEventListener<
  E extends BootstrapProcessMainEvent
> = E extends "uiReady"
  ? () => void
  : E extends "confirmInstallDependencies"
    ? (result: ConfirmInstallDependenciesResult) => void
    : E extends "exit"
      ? () => void
      : never;
