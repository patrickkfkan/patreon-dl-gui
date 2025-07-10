import type {
  BrowserObtainableInput,
  CustomSelectionValue,
  UIConfig
} from "../types/UIConfig";
import type { FileConfig, FileConfigContents } from "../types/FileConfig";
import dateFormat from "dateformat";
import { EOL } from "os";
import { openSync, writeSync } from "fs";
import type { SaveFileConfigResult } from "../types/MainEvents";

const TRUE_STRING = "1";
const FALSE_STRING = "0";

export function convertUIConfigToFileContents(config: UIConfig, extra: { userAgent: string }) {
  const postsPublished = config.include["posts.published"];
  let postsPublishedAfter = "",
    postsPublishedBefore = "";
  switch (postsPublished.type) {
    case "after":
      postsPublishedAfter = getDateTimePickerValue(postsPublished.after);
      break;
    case "before":
      postsPublishedBefore = getDateTimePickerValue(postsPublished.before);
      break;
    case "between":
      postsPublishedAfter = getDateTimePickerValue(postsPublished.after);
      postsPublishedBefore = getDateTimePickerValue(postsPublished.before);
      break;
  }

  const tierIds = config["support.data"].browserObtainedValues.tiers?.map(
    (tier) => tier.id
  );

  const contents: FileConfigContents = {
    downloader: {
      "target.url": getBrowserObtainableInputValue(config.downloader.target),
      cookie: getBrowserObtainableInputValue(config.downloader.cookie),
      "use.status.cache": booleanToString(
        config.downloader["use.status.cache"]
      ),
      "stop.on": config.downloader["stop.on"].trim(),
      "no.prompt": booleanToString(config.downloader["no.prompt"]),
      "dry.run": booleanToString(config.downloader["dry.run"]),
      "path.to.ffmpeg": config.downloader["path.to.ffmpeg"].trim()
    },
    output: {
      "out.dir": config.output["out.dir"].trim(),
      "campaign.dir.name.format":
        config.output["campaign.dir.name.format"].trim(),
      "content.dir.name.format":
        config.output["content.dir.name.format"].trim(),
      "media.filename.format": config.output["media.filename.format"].trim(),
      "content.file.exists.action":
        config.output["content.file.exists.action"].trim(),
      "info.file.exists.action":
        config.output["info.file.exists.action"].trim(),
      "info.api.file.exists.action":
        config.output["info.api.file.exists.action"].trim()
    },
    include: {
      "locked.content": booleanToString(config.include["locked.content"]),
      "posts.in.tier": getCustomSelectionValue(
        config.include["posts.in.tier"],
        tierIds
      ),
      "posts.with.media.type": getCustomSelectionValue(
        config.include["posts.with.media.type"]
      ),
      "posts.published.after": postsPublishedAfter,
      "posts.published.before": postsPublishedBefore,
      "campaign.info": booleanToString(config.include["campaign.info"]),
      "content.info": booleanToString(config.include["content.info"]),
      "content.media": getCustomSelectionValue(config.include["content.media"]),
      "preview.media": getCustomSelectionValue(config.include["preview.media"]),
      "all.media.variants": booleanToString(
        config.include["all.media.variants"]
      ),
      "images.by.filename": config.include["images.by.filename"].trim(),
      "audio.by.filename": config.include["audio.by.filename"].trim(),
      "attachments.by.filename":
        config.include["attachments.by.filename"].trim(),
      comments: booleanToString(config.include.comments)
    },
    request: {
      "max.retries": numberToString(config.request["max.retries"]),
      "max.concurrent": numberToString(config.request["max.concurrent"]),
      "min.time": numberToString(config.request["min.time"]),
      "proxy.url": config.request["proxy.url"].trim(),
      "proxy.reject.unauthorized.tls": booleanToString(
        config.request["proxy.reject.unauthorized.tls"]
      ),
      "user.agent": extra.userAgent
    },
    "embed.downloader.youtube": {
      exec:
        config["embed.downloader.youtube"].type === "custom" ?
          config["embed.downloader.youtube"].exec.trim()
        : ""
    },
    "embed.downloader.vimeo": {
      exec: config["embed.downloader.vimeo"].exec.trim()
    },
    "logger.console": {
      enabled: booleanToString(config["logger.console"].enabled),
      "log.level": config["logger.console"]["log.level"],
      "include.date.time": booleanToString(
        config["logger.console"]["include.date.time"]
      ),
      "include.level": booleanToString(
        config["logger.console"]["include.level"]
      ),
      "include.originator": booleanToString(
        config["logger.console"]["include.originator"]
      ),
      "include.error.stack": booleanToString(
        config["logger.console"]["include.error.stack"]
      ),
      "date.time.format": config["logger.console"]["date.time.format"].trim(),
      color: booleanToString(config["logger.console"]["color"])
    },
    "logger.file.1": {
      enabled: booleanToString(config["logger.file.1"].enabled),
      "log.dir": config["logger.file.1"]["log.dir"].trim(),
      "log.filename": config["logger.file.1"]["log.filename"].trim(),
      "file.exists.action": config["logger.file.1"]["file.exists.action"],
      "log.level": config["logger.file.1"]["log.level"],
      "include.date.time": booleanToString(
        config["logger.file.1"]["include.date.time"]
      ),
      "include.level": booleanToString(
        config["logger.file.1"]["include.level"]
      ),
      "include.originator": booleanToString(
        config["logger.file.1"]["include.originator"]
      ),
      "include.error.stack": booleanToString(
        config["logger.file.1"]["include.error.stack"]
      ),
      "date.time.format": config["logger.file.1"]["date.time.format"].trim(),
      color: booleanToString(config["logger.file.1"]["color"])
    },
    "patreon.dl.gui": {
      "connect.youtube": booleanToString(
        config["patreon.dl.gui"]["connect.youtube"]
      ),
      "vimeo.downloader.type": config["embed.downloader.vimeo"].type,
      "vimeo.helper.ytdlp.path":
        config["embed.downloader.vimeo"]["helper.ytdlp.path"].trim() || "",
      "vimeo.helper.password":
        config["embed.downloader.vimeo"]["helper.password"].trim() || ""
    }
  };

  return contents;
}

export function convertUIConfigToFileContentsString(config: UIConfig, extra: { userAgent: string }) {
  const contents = convertUIConfigToFileContents(config, extra);
  const lines: string[] = [];
  for (const [section, sectionContent] of Object.entries(contents)) {
    lines.push(`[${section}]`);
    for (const [key, value] of Object.entries(sectionContent)) {
      const v = value.includes(" ") ? `"${value}"` : value;
      lines.push(`${key} = ${v}`);
    }
    lines.push("");
  }

  return lines.join(EOL);
}

function getBrowserObtainableInputValue(value: BrowserObtainableInput) {
  switch (value.inputMode) {
    case "browser":
      return value.browserValue?.value || "";
    case "manual":
      return value.manualValue;
  }
}

function booleanToString(value: boolean) {
  return value ? TRUE_STRING : FALSE_STRING;
}

function getCustomSelectionValue<T extends boolean | string, V extends string>(
  value: CustomSelectionValue<T, V>,
  filter?: V[]
) {
  if (value.type === "custom") {
    if (filter) {
      return value.custom.filter((v) => filter.includes(v)).join(",");
    }
    return value.custom.join(",");
  }
  if (typeof value.type === "string") {
    return value.type;
  }
  return booleanToString(value.type);
}

function numberToString(value: number) {
  return String(value);
}

function getDateTimePickerValue(value: string) {
  if (!value) {
    return "";
  }
  const df = "yyyy-mm-dd HH:MM:ss o";
  try {
    const date = new Date(value);
    return dateFormat(date, df);
  } catch (error) {
    console.error(error);
    return "";
  }
}

export function saveFileConfig(
  config: FileConfig<"hasPath">
): SaveFileConfigResult {
  try {
    const handle = openSync(config.filePath, "w");
    writeSync(handle, config.contents);
    return {
      config
    };
  } catch (error: unknown) {
    return {
      hasError: true,
      error: `Error writing config to "${config.filePath}": ${error instanceof Error ? error.message : error}`
    };
  }
}
