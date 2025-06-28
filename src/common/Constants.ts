import { app } from "electron";
import envPaths from "env-paths";

export const APP_DATA_PATH = envPaths(app.getName(), {
  suffix: ""
}).data;

export const APP_URL = "https://github.com/patrickkfkan/patreon-dl-gui";

export const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0 Config/91.2.2121.13";
