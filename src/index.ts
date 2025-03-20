import MainProcess from "./core/MainProcess";
import { app } from "electron";
import electronStartup from "electron-squirrel-startup";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (electronStartup) {
  app.quit();
}

app.on("ready", async () => {
  const main = new MainProcess();
  await main.start();
});

app.on("window-all-closed", () => {
  app.quit();
});
