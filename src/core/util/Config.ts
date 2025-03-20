import { FileLogger } from "patreon-dl";
import path from "path";

export type ValidateProxyURLResult =
  | {
      isValid: true;
    }
  | {
      isValid: false;
      error: string;
    };

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

export function validateProxyURL(url: string): ValidateProxyURLResult {
  try {
    const urlObj = new URL(url);
    if (!["http:", "https:", "socks4:", "socks5:"].includes(urlObj.protocol)) {
      throw Error(
        `Proxy protocol must be one of "http", "https", "socks4", "socks5"`
      );
    }
    return {
      isValid: true
    };
  } catch (error: unknown) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
