import { FileLogger } from "patreon-dl";
import path from "path";

export function getDefaultFileLoggerOptions() {
  const config = { ...FileLogger.getDefaultConfig() };
  config.enabled = false;

  /**
   * Note: we do not need this with next version of patreon-dl,
   * as FileLogger.getDefaultConfig() will return logDir with path.sep.
   */
  config.logDir = config.logDir.replaceAll("/", path.sep);

  return config;
}
