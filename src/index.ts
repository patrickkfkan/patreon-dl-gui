import MainProcess from "./main/MainProcess";
import { app, session } from "electron";
import parseArgs from "yargs-parser";
import { USER_AGENT } from "./common/Constants";
import ServerConsoleProcess from "./server-console/ServerConsoleProcess";


app.on("ready", async () => {
  const processArgs = parseArgs(process.argv);
  const serverConsole = Reflect.has(processArgs, 'server-console');
  if (serverConsole) {
    const serverConsoleProcess = new ServerConsoleProcess();
    await serverConsoleProcess.start();
  }
  else {
    session.defaultSession.setUserAgent(USER_AGENT);
    const main = new MainProcess();
    await main.start();
  }
});

app.on("window-all-closed", () => {
  app.quit();
});
