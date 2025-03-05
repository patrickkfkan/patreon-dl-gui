import MainProcess from "./core/MainProcess";
import { app } from "electron";
import electronStartup from "electron-squirrel-startup";
import parseArgs from "yargs-parser";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (electronStartup) {
  app.quit();
}

const args = parseArgs(process.argv);

app.on("ready", async () => {
  const main = new MainProcess({
    mainWindow: {
      size: { w: 570, h: 845 },
      devTools: Reflect.has(args, "dev-tools")
    }
  });
  await main.start();
});

app.on("window-all-closed", () => {
  app.quit();
});
