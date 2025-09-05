import type {
  BrowserObtainableInput,
  CustomSelectionValue,
  UIConfig
} from "../types/UIConfig";
import type { UnionToTuple } from "../../common/types/Utility";
import type { FileConfigProp, FileConfigSection } from "../types/FileConfig";
import { FILE_CONFIG_SECTION_PROPS } from "../Constants";
import type { AlertMessage } from "../types/App";
import { getStartupUIConfig } from "./UIConfig";
import ConfigParser from "configparser";
import type {
  FileExistsAction,
  FileLoggerOptions,
  FileLoggerType,
  LogLevel,
  StopOnCondition
} from "patreon-dl";
import { DateTime } from "patreon-dl";
import path from "path";
import { existsSync } from "fs";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface LoadFileResult {
  config: UIConfig | null;
  alerts: AlertMessage[];
}

type BooleanString = "1" | "yes" | "true" | "0" | "no" | "false";
type LogFileExistsAction = Exclude<
  FileLoggerOptions<FileLoggerType.Downloader>["fileExistsAction"],
  undefined
>;

type ParseValueResult<V> =
  | {
      result?: undefined;
      hasError: true;
      messages: AlertMessage[];
    }
  | {
      result: V;
      hasError: false;
      messages?: AlertMessage[];
    };

type ParseValuesResult<
  S extends FileConfigSection,
  P extends FileConfigProp<S>,
  V
> =
  | {
      result?: undefined;
      hasError: true;
      messages: Partial<Record<P, AlertMessage[]>>;
    }
  | {
      result: V;
      hasError: false;
      messages?: Partial<Record<P, AlertMessage[]>>;
    };

function toBrowserObtainableInput(
  value: string
): ParseValueResult<BrowserObtainableInput> {
  return {
    result: {
      inputMode: value ? "manual" : "browser",
      browserValue: value ? { value, description: "" } : null,
      manualValue: value
    },
    hasError: false
  };
}

function toBoolean(value: string): ParseValueResult<boolean> {
  const { result, hasError, messages } = toOneOf<BooleanString>(value, [
    "1",
    "yes",
    "true",
    "0",
    "no",
    "false"
  ]);
  if (hasError) {
    return {
      result: undefined,
      hasError,
      messages
    };
  }
  const r = result === "1" || result === "yes" || result === "true";
  return {
    result: r,
    hasError: false,
    messages
  };
}

function toOneOf<V extends string>(
  value: string,
  matches: UnionToTuple<V>
): ParseValueResult<V> {
  if (matches.includes(value as string)) {
    return {
      result: value as V,
      hasError: false
    };
  }
  return {
    hasError: true,
    messages: [
      {
        type: "error",
        text: `Unknown value "${value}" - must be one of ${matches.map((m) => `"${m}"`).join(", ")}`
      }
    ]
  };
}

function toFileExistsAction(value: string) {
  return toOneOf<FileExistsAction>(value, [
    "overwrite",
    "skip",
    "saveAsCopy",
    "saveAsCopyIfNewer"
  ]);
}

function toLogLevel(value: string) {
  return toOneOf<LogLevel>(value, ["info", "debug", "warn", "error"]);
}

function toNumber(value: string): ParseValueResult<number> {
  const n = Number(value);
  if (!isNaN(n)) {
    return {
      result: n,
      hasError: false
    };
  }
  return {
    hasError: true,
    messages: [
      {
        type: "error",
        text: `Invalid value "${value}" - must be a number`
      }
    ]
  };
}

function toString(value: string): ParseValueResult<string> {
  return {
    result: value,
    hasError: false
  };
}

function toCustomSelectionValue<T extends boolean | string, V extends string>(
  value: string,
  typeFn: (value: string) => ParseValueResult<T | "custom">,
  matches?: UnionToTuple<V>
): ParseValueResult<CustomSelectionValue<T, V>> {
  const { result: type, hasError, messages } = typeFn(value);
  if (hasError) {
    return {
      hasError: true,
      messages
    };
  }
  if (type !== "custom") {
    return {
      result: {
        type,
        custom: []
      },
      hasError: false,
      messages
    };
  }
  const splitted = value.split(",").map((v) => v.trim());
  if (!matches) {
    return {
      result: {
        type,
        custom: splitted.map((v) => v.trim()) as V[]
      },
      hasError: false,
      messages
    };
  }
  const warnings = splitted.reduce<AlertMessage[]>((r, v) => {
    if (!matches.includes(v.trim())) {
      r.push({
        type: "warn",
        text: `Invalid value "${v}" - must be one of ${matches.map((m) => `"${m}"`).join(", ")}`
      });
    }
    return r;
  }, []);
  const allMessages = [...(messages || []), ...warnings];
  return {
    result: {
      type,
      custom: splitted.filter((v) => matches.includes(v.trim())) as V[]
    },
    hasError: false,
    messages: allMessages.length > 0 ? allMessages : undefined
  };
}

function toDateTimePickerValue(value: string): ParseValueResult<string> {
  try {
    const dt = DateTime.from(value);
    return {
      result: dt.valueOf().toISOString().slice(0, 16),
      hasError: false
    };
  } catch (error: unknown) {
    return {
      hasError: true,
      messages: [
        {
          type: "error",
          text: `Error parsing date value "${value}": ${error instanceof Error ? error.message : error}`
        }
      ]
    };
  }
}

function toTargetValue(
  value: string
): ParseValueResult<BrowserObtainableInput> {
  const messages: AlertMessage[] = [];
  const { result: valueToURL, hasError: valueToURLError } = parseURL(value);
  if (!valueToURLError) {
    // Check if original value contains semi-colon - this indicates multiple URLs
    if (value.includes(";")) {
      messages.push({
        type: "warn",
        text: "Multiple target URLs not supported. Only the first one will be used."
      });
      const first = value.split(";")[0];
      const {
        result: firstURL,
        hasError,
        messages: firstURLMessages
      } = parseURL(first);
      if (hasError) {
        return {
          hasError: true,
          messages: [...messages, ...firstURLMessages]
        };
      }
      const result = toBrowserObtainableInput(firstURL);
      if (messages.length > 0) {
        result.messages = [...messages, ...(result.messages || [])];
      }
      return result;
    }
    return toBrowserObtainableInput(valueToURL);
  }
  // Value is not valid URL - check if it is a file path
  const filePath = path.resolve(__dirname, value);
  if (existsSync(filePath)) {
    return {
      hasError: true,
      messages: [
        {
          type: "error",
          text: "Target files are not supported"
        }
      ]
    };
  }
  return {
    hasError: true,
    messages: [
      {
        type: "error",
        text: `Target "${value}" is invalid`
      }
    ]
  };
}

export function loadUIConfigFromFile(filePath: string): LoadFileResult {
  const parser = new ConfigParser();
  try {
    parser.read(filePath);
  } catch (error: unknown) {
    return {
      config: null,
      alerts: [
        {
          type: "error",
          text: `Could not load config from "${filePath}": ${
            error instanceof Error ? error.message
            : typeof error === "object" ? JSON.stringify(error)
            : error
          }`
        }
      ]
    };
  }

  const allMessages: AlertMessage[] = [];

  const defaultConfig = getStartupUIConfig();
  for (const section of parser.sections()) {
    if (!isFileConfigSection(section)) {
      allMessages.push({
        type: "warn",
        text: `[${section}]: Skipped - not supported`
      });
      continue;
    }
    for (const prop of Object.keys(parser.items(section))) {
      if (!isFileConfigProp(section, prop)) {
        allMessages.push({
          type: "warn",
          text: `[${section}]->${prop}: Skipped - not supported`
        });
      }
    }
  }

  const __getFileConfigValue = <S extends FileConfigSection>(
    section: S,
    prop: FileConfigProp<S>
  ) => {
    const v = parser.get(section, prop);
    if (!v) {
      return v;
    }
    let r = v.trim();
    if (r && r.startsWith('"') && r.endsWith('"')) {
      r = r.substring(1, r.length - 1);
    }
    return r.trim();
  };

  const __fromFileConfigValue = <S extends FileConfigSection, V>(
    section: S,
    prop: FileConfigProp<S>,
    defaultValue: V,
    parseFn: (value: string) => ParseValueResult<V>
  ) => {
    const fv = __getFileConfigValue(section, prop);
    if (!fv) {
      return defaultValue;
    }
    const { result, hasError, messages } = parseFn(fv);
    if (messages) {
      allMessages.push(
        ...messages.map((m) => ({
          type: m.type,
          text: `[${section}] ${prop}: ${m.text}`
        }))
      );
    }
    if (hasError) {
      return defaultValue;
    }
    return result;
  };

  const __fromFileConfigValues = <
    S extends FileConfigSection,
    P extends FileConfigProp<S>,
    V
  >(
    section: S,
    props: P[],
    defaultValue: V,
    parseFn: (
      value: Record<P, string | undefined>
    ) => ParseValuesResult<S, P, V>
  ) => {
    const fv = props.reduce(
      (r, p) => {
        r[p] = __getFileConfigValue(section, p);
        return r;
      },
      {} as Record<P, string | undefined>
    );
    if (Object.values(fv).every((v) => !v)) {
      return defaultValue;
    }
    const { result, hasError, messages } = parseFn(fv);
    if (messages) {
      for (const [prop, _messages] of Object.entries<
        AlertMessage[] | undefined
      >(messages)) {
        if (_messages) {
          allMessages.push(
            ..._messages.map((m) => ({
              type: m.type,
              text: `[${section}] ${prop}: ${m.text}`
            }))
          );
        }
      }
    }
    if (hasError) {
      return defaultValue;
    }
    return result;
  };

  const config: UIConfig = {
    downloader: {
      target: __fromFileConfigValue(
        "downloader",
        "target.url",
        defaultConfig.downloader["target"],
        toTargetValue
      ),
      cookie: __fromFileConfigValue(
        "downloader",
        "cookie",
        defaultConfig.downloader["cookie"],
        toBrowserObtainableInput
      ),
      "path.to.ffmpeg": __fromFileConfigValue(
        "downloader",
        "path.to.ffmpeg",
        defaultConfig.downloader["path.to.ffmpeg"],
        toString
      ),
      "use.status.cache": __fromFileConfigValue(
        "downloader",
        "use.status.cache",
        defaultConfig.downloader["use.status.cache"],
        toBoolean
      ),
      "stop.on": __fromFileConfigValue(
        "downloader",
        "stop.on",
        defaultConfig.downloader["stop.on"],
        (value) =>
          toOneOf<StopOnCondition>(value, [
            "never",
            "postPreviouslyDownloaded",
            "postPublishDateOutOfRange"
          ])
      ),
      "no.prompt": __fromFileConfigValue(
        "downloader",
        "no.prompt",
        defaultConfig.downloader["no.prompt"],
        toBoolean
      ),
      "dry.run": __fromFileConfigValue(
        "downloader",
        "dry.run",
        defaultConfig.downloader["dry.run"],
        toBoolean
      )
    },
    output: {
      "out.dir": __fromFileConfigValue(
        "output",
        "out.dir",
        defaultConfig.output["out.dir"],
        toString
      ),
      "campaign.dir.name.format": __fromFileConfigValue(
        "output",
        "campaign.dir.name.format",
        defaultConfig.output["campaign.dir.name.format"],
        toString
      ),
      "content.dir.name.format": __fromFileConfigValue(
        "output",
        "content.dir.name.format",
        defaultConfig.output["content.dir.name.format"],
        toString
      ),
      "media.filename.format": __fromFileConfigValue(
        "output",
        "media.filename.format",
        defaultConfig.output["media.filename.format"],
        toString
      ),
      "content.file.exists.action": __fromFileConfigValue(
        "output",
        "content.file.exists.action",
        defaultConfig.output["content.file.exists.action"],
        toFileExistsAction
      ),
      "info.file.exists.action": __fromFileConfigValue(
        "output",
        "info.file.exists.action",
        defaultConfig.output["info.file.exists.action"],
        toFileExistsAction
      ),
      "info.api.file.exists.action": __fromFileConfigValue(
        "output",
        "info.api.file.exists.action",
        defaultConfig.output["info.api.file.exists.action"],
        toFileExistsAction
      )
    },
    include: {
      "locked.content": __fromFileConfigValue(
        "include",
        "locked.content",
        defaultConfig.include["locked.content"],
        toBoolean
      ),
      "campaign.info": __fromFileConfigValue(
        "include",
        "campaign.info",
        defaultConfig.include["campaign.info"],
        toBoolean
      ),
      "content.info": __fromFileConfigValue(
        "include",
        "content.info",
        defaultConfig.include["content.info"],
        toBoolean
      ),
      "content.media": __fromFileConfigValue(
        "include",
        "content.media",
        defaultConfig.include["content.media"],
        (value) =>
          toCustomSelectionValue(
            value,
            (value) => {
              const { result, hasError } = toBoolean(value);
              if (hasError) {
                return {
                  result: "custom",
                  hasError: false
                };
              }
              return {
                result,
                hasError: false
              };
            },
            ["image", "video", "audio", "attachment", "file"]
          )
      ),
      "preview.media": __fromFileConfigValue(
        "include",
        "preview.media",
        defaultConfig.include["preview.media"],
        (value) =>
          toCustomSelectionValue(
            value,
            (value) => {
              const { result, hasError } = toBoolean(value);
              if (hasError) {
                return {
                  result: "custom",
                  hasError: false
                };
              }
              return {
                result,
                hasError: false
              };
            },
            ["image", "video", "audio"]
          )
      ),
      "all.media.variants": __fromFileConfigValue(
        "include",
        "all.media.variants",
        defaultConfig.include["all.media.variants"],
        toBoolean
      ),
      "images.by.filename": __fromFileConfigValue(
        "include",
        "images.by.filename",
        defaultConfig.include["images.by.filename"],
        toString
      ),
      "audio.by.filename": __fromFileConfigValue(
        "include",
        "audio.by.filename",
        defaultConfig.include["audio.by.filename"],
        toString
      ),
      "attachments.by.filename": __fromFileConfigValue(
        "include",
        "attachments.by.filename",
        defaultConfig.include["attachments.by.filename"],
        toString
      ),
      "posts.in.tier": __fromFileConfigValue(
        "include",
        "posts.in.tier",
        defaultConfig.include["posts.in.tier"],
        (value) =>
          toCustomSelectionValue(value, (value) => {
            return {
              result: value === "any" ? value : "custom",
              hasError: false
            };
          })
      ),
      "posts.with.media.type": __fromFileConfigValue(
        "include",
        "posts.with.media.type",
        defaultConfig.include["posts.with.media.type"],
        (value) =>
          toCustomSelectionValue(
            value,
            (value) => {
              return {
                result: value === "any" || value === "none" ? value : "custom",
                hasError: false
              };
            },
            ["image", "video", "audio", "attachment", "podcast"]
          )
      ),
      "posts.published": __fromFileConfigValues(
        "include",
        ["posts.published.after", "posts.published.before"],
        defaultConfig.include["posts.published"],
        (values) => {
          const rmsg: Partial<Record<keyof typeof values, AlertMessage[]>> = {};
          const __parseDate = (key: keyof typeof values) => {
            if (values[key]) {
              const { result, hasError, messages } = toDateTimePickerValue(
                values[key]
              );
              if (messages) {
                rmsg[key] = messages;
              }
              if (hasError) {
                return "";
              }
              return result;
            }
            return "";
          };
          const after = __parseDate("posts.published.after");
          const before = __parseDate("posts.published.before");
          let type: "anytime" | "after" | "before" | "between";
          if (after && before) {
            type = "between";
          } else if (after) {
            type = "after";
          } else if (before) {
            type = "before";
          } else {
            type = "anytime";
          }
          return {
            result: { type, after, before },
            hasError: false,
            messages: rmsg
          };
        }
      ),
      comments: __fromFileConfigValue(
        "include",
        "comments",
        defaultConfig.include["comments"],
        toBoolean
      )
    },
    request: {
      "max.retries": __fromFileConfigValue(
        "request",
        "max.retries",
        defaultConfig.request["max.retries"],
        toNumber
      ),
      "max.concurrent": __fromFileConfigValue(
        "request",
        "max.concurrent",
        defaultConfig.request["max.concurrent"],
        toNumber
      ),
      "min.time": __fromFileConfigValue(
        "request",
        "min.time",
        defaultConfig.request["min.time"],
        toNumber
      ),
      "proxy.url": __fromFileConfigValue(
        "request",
        "proxy.url",
        defaultConfig.request["proxy.url"],
        toString
      ),
      "proxy.reject.unauthorized.tls": __fromFileConfigValue(
        "request",
        "proxy.reject.unauthorized.tls",
        defaultConfig.request["proxy.reject.unauthorized.tls"],
        toBoolean
      )
    },
    "embed.downloader.youtube": {
      type:
        __getFileConfigValue("embed.downloader.youtube", "exec") ? "custom" : (
          "default"
        ),
      exec: __fromFileConfigValue(
        "embed.downloader.youtube",
        "exec",
        defaultConfig["embed.downloader.youtube"]["exec"],
        toString
      )
    },
    "embed.downloader.vimeo": {
      type: __fromFileConfigValue(
        "patreon.dl.gui",
        "vimeo.downloader.type",
        defaultConfig["embed.downloader.vimeo"]["type"],
        (value) =>
          toOneOf<UIConfig["embed.downloader.vimeo"]["type"]>(value, [
            "helper",
            "custom"
          ])
      ),
      exec: __fromFileConfigValue(
        "embed.downloader.vimeo",
        "exec",
        defaultConfig["embed.downloader.vimeo"]["exec"],
        toString
      ),
      "helper.ytdlp.path": __fromFileConfigValue(
        "patreon.dl.gui",
        "vimeo.helper.ytdlp.path",
        defaultConfig["embed.downloader.vimeo"]["helper.ytdlp.path"],
        toString
      ),
      "helper.password": __fromFileConfigValue(
        "patreon.dl.gui",
        "vimeo.helper.password",
        defaultConfig["embed.downloader.vimeo"]["helper.password"],
        toString
      ),
      "helper.ytdlp.args": __fromFileConfigValue(
        "patreon.dl.gui",
        "vimeo.helper.ytdlp.args",
        defaultConfig["embed.downloader.vimeo"]["helper.ytdlp.args"],
        toString
      )
    },
    "logger.console": {
      enabled: __fromFileConfigValue(
        "logger.console",
        "enabled",
        defaultConfig["logger.console"]["enabled"],
        toBoolean
      ),
      "log.level": __fromFileConfigValue(
        "logger.console",
        "log.level",
        defaultConfig["logger.console"]["log.level"],
        toLogLevel
      ),
      "include.date.time": __fromFileConfigValue(
        "logger.console",
        "include.date.time",
        defaultConfig["logger.console"]["include.date.time"],
        toBoolean
      ),
      "include.level": __fromFileConfigValue(
        "logger.console",
        "include.level",
        defaultConfig["logger.console"]["include.level"],
        toBoolean
      ),
      "include.originator": __fromFileConfigValue(
        "logger.console",
        "include.originator",
        defaultConfig["logger.console"]["include.originator"],
        toBoolean
      ),
      "include.error.stack": __fromFileConfigValue(
        "logger.console",
        "include.error.stack",
        defaultConfig["logger.console"]["include.error.stack"],
        toBoolean
      ),
      "date.time.format": __fromFileConfigValue(
        "logger.console",
        "date.time.format",
        defaultConfig["logger.console"]["date.time.format"],
        toString
      ),
      color: __fromFileConfigValue(
        "logger.console",
        "color",
        defaultConfig["logger.console"]["color"],
        toBoolean
      )
    },
    "logger.file.1": {
      enabled: __fromFileConfigValue(
        "logger.file.1",
        "enabled",
        defaultConfig["logger.file.1"]["enabled"],
        toBoolean
      ),
      "log.level": __fromFileConfigValue(
        "logger.file.1",
        "log.level",
        defaultConfig["logger.file.1"]["log.level"],
        toLogLevel
      ),
      "log.dir": __fromFileConfigValue(
        "logger.file.1",
        "log.dir",
        defaultConfig["logger.file.1"]["log.dir"],
        toString
      ),
      "log.filename": __fromFileConfigValue(
        "logger.file.1",
        "log.filename",
        defaultConfig["logger.file.1"]["log.filename"],
        toString
      ),
      "file.exists.action": __fromFileConfigValue(
        "logger.file.1",
        "file.exists.action",
        defaultConfig["logger.file.1"]["file.exists.action"],
        (value) => toOneOf<LogFileExistsAction>(value, ["append", "overwrite"])
      ),
      "include.date.time": __fromFileConfigValue(
        "logger.file.1",
        "include.date.time",
        defaultConfig["logger.file.1"]["include.date.time"],
        toBoolean
      ),
      "include.level": __fromFileConfigValue(
        "logger.file.1",
        "include.level",
        defaultConfig["logger.file.1"]["include.level"],
        toBoolean
      ),
      "include.originator": __fromFileConfigValue(
        "logger.file.1",
        "include.originator",
        defaultConfig["logger.file.1"]["include.originator"],
        toBoolean
      ),
      "include.error.stack": __fromFileConfigValue(
        "logger.file.1",
        "include.error.stack",
        defaultConfig["logger.file.1"]["include.error.stack"],
        toBoolean
      ),
      "date.time.format": __fromFileConfigValue(
        "logger.file.1",
        "date.time.format",
        defaultConfig["logger.file.1"]["date.time.format"],
        toString
      ),
      color: __fromFileConfigValue(
        "logger.file.1",
        "color",
        defaultConfig["logger.file.1"]["color"],
        toBoolean
      )
    },
    "patreon.dl.gui": {
      "connect.youtube": __fromFileConfigValue(
        "patreon.dl.gui",
        "connect.youtube",
        false,
        toBoolean
      )
    },
    "support.data": {
      browserObtainedValues: {
        target: null,
        cookie: null,
        tiers: null
      },
      appliedProxySettings: {
        url: defaultConfig["request"]["proxy.url"],
        rejectUnauthorizedTLS:
          defaultConfig["request"]["proxy.reject.unauthorized.tls"]
      }
    }
  };

  config.downloader.target.inputMode = "browser";
  config.downloader.cookie.inputMode = "browser";
  config["support.data"].appliedProxySettings.url = config.request["proxy.url"];
  config["support.data"].appliedProxySettings.rejectUnauthorizedTLS =
    config.request["proxy.reject.unauthorized.tls"];

  return {
    config,
    alerts: allMessages
  };
}

function isFileConfigSection(
  sectionName: string
): sectionName is FileConfigSection {
  return Object.keys(FILE_CONFIG_SECTION_PROPS).includes(sectionName);
}

function isFileConfigProp(section: FileConfigSection, propName: string) {
  return (FILE_CONFIG_SECTION_PROPS[section] as unknown as string[]).includes(
    propName
  );
}

function parseURL(value: string): ParseValueResult<string> {
  try {
    const urlObj = new URL(value);
    return {
      result: urlObj.toString(),
      hasError: false
    };
  } catch (error: unknown) {
    return {
      hasError: true,
      messages: [
        {
          type: "error",
          text: `Error parsing URL "${value}": ${error instanceof Error ? error.message : error}`
        }
      ]
    };
  }
}
