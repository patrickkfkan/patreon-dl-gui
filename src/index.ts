import MainProcess from "./core/MainProcess";
import { app } from "electron";
import electronStartup from "electron-squirrel-startup";
import parseArgs from "yargs-parser";
import BootstrapProcess from "./bootstrap/BootstrapProcess";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (electronStartup) {
  app.quit();
}

const args = parseArgs(process.argv);
const showDevTools = Reflect.has(args, "dev-tools");

let isBootstrapping = false;

app.on("ready", async () => {
  isBootstrapping = true;
  const bootstrap = new BootstrapProcess({
    window: { devTools: showDevTools }
  });
  const bootstrapResult = await bootstrap.start();
  if (
    bootstrapResult.status === "aborted" ||
    bootstrapResult.status === "error"
  ) {
    app.quit();
    return;
  }
  isBootstrapping = false;
  const main = new MainProcess({
    mainWindow: {
      size: { w: 570, h: 845 },
      devTools: Reflect.has(args, "dev-tools")
    },
    browser: {
      executablePath: bootstrapResult.data.browserExecutablePath
    }
  });
  await main.start();
});

app.on("window-all-closed", () => {
  if (isBootstrapping) {
    return;
  }
  app.quit();
});
