import { app } from "electron";
import envPaths from "env-paths";

export const APP_DATA_PATH = envPaths(app.getName(), {
  suffix: ""
}).data;

export const APP_URL = "https://github.com/patrickkfkan/patreon-dl-gui";
