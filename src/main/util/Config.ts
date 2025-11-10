import { FileLogger } from "patreon-dl";
import { MAX_VIDEO_RESOLUTIONS } from "../Constants";
import { type MaxVideoResolution } from "../types/UIConfig";

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

export function normalizeMaxVideoResolution(value: string | number | null): MaxVideoResolution {
  if (!value || (typeof value === "number" && value < 0)) {
    return "none";
  }
  let s = typeof value === 'string' ? value.trim() : String(value);
  if (!s.endsWith('p')) {
    s = `${s}p`;
  }
  if (MAX_VIDEO_RESOLUTIONS.includes(s as MaxVideoResolution)) {
    return s as MaxVideoResolution;
  }
  throw Error(`Unrecognized value "${value}"`);
}