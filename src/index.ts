import MainProcess from "./main/MainProcess";
import { app, session } from "electron";
import parseArgs from "yargs-parser";
import ServerConsoleProcess from "./server-console/ServerConsoleProcess";

/**
 * Electron injects the app name and version into the default user agent string. E.g.:
 * "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko)
 * patreon-dl-gui/2.2.0 Chrome/132.0.6834.159 Electron/34.0.2 Safari/537.36"
 * This function returns the default user agent string for the application
 * without the app name and version.
 * @returns The default user agent string for the application.
 */
function getDefaultUserAgent() {
  // Just strip the app name and version from the default user agent string.
  // It's important to leave everything else intact to avoid Cloudflare (if triggered)
  // going into a loop.
  return session.defaultSession.getUserAgent().replace(
    ` ${app.name}/${app.getVersion()}`, ''
  );
}

app.on("ready", async () => {
  const processArgs = parseArgs(process.argv);
  const serverConsole = Reflect.has(processArgs, 'server-console');
  if (serverConsole) {
    const serverConsoleProcess = new ServerConsoleProcess();
    await serverConsoleProcess.start();
  }
  else {
    const defaultUserAgent = getDefaultUserAgent();
    session.defaultSession.setUserAgent(defaultUserAgent);
    const main = new MainProcess({ defaultUserAgent });
    await main.start();
  }
});

app.on("window-all-closed", () => {
  app.quit();
});
