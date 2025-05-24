import MainProcess from "./core/MainProcess";
import { app, session } from "electron";
import electronStartup from "electron-squirrel-startup";
import { USER_AGENT } from "./core/Constants";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (electronStartup) {
  app.quit();
}

app.on("ready", async () => {
  session.defaultSession.setUserAgent(USER_AGENT);
  const main = new MainProcess();
  await main.start();
});

app.on("window-all-closed", () => {
  app.quit();
});
