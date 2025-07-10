import type { DeepRequired } from "patreon-dl";
import type { ServerConsoleWindowProps } from "./ServerConsoleWindow";

export const DEFAULT_SERVER_CONSOLE_WINDOW_PROPS: ServerConsoleWindowProps &
  DeepRequired<Omit<ServerConsoleWindowProps, "position">> = {
  size: { width: 800, height: 480 },
  minSize: { width: 800, height: 480 },
  state: "normal",
  devTools: false
};
