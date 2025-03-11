import { FileLogger } from "patreon-dl";
import path from "path";

/**
 * Note: we do not need this with next version of patreon-dl,
 * as FileLogger.getDefaultConfig() will return logDir with path.sep.
 */
export function getDefaultFileLoggerOptions() {
  const config = { ...FileLogger.getDefaultConfig() };
  config.logDir = config.logDir.replaceAll("/", path.sep);
  return config;
}
