import type { MaxVideoResolution, UIConfig } from "../types/UIConfig";
import type { DateTime } from "patreon-dl";
import {
  ConsoleLogger,
  getDefaultDownloaderOptions,
  type DeepRequired,
  type DownloaderOptions
} from "patreon-dl";
import {
  getDefaultFileLoggerOptions,
  normalizeMaxVideoResolution
} from "../util/Config";
import os from "os";
import path from "path";

// Override patreon-dl default output path to user's home directory
const defaultOutputPath = path.join(os.homedir(), "patreon-dl");

export function getStartupUIConfig(): UIConfig {
  return convertPatreonDLOptionsToUIConfig(getDefaultDownloaderOptions());
}

function convertPatreonDLOptionsToUIConfig(
  p: DeepRequired<DownloaderOptions>
): UIConfig {
  const __convertPublishDate = (date: DateTime | null) => {
    if (!date) {
      return "";
    }
    return date.valueOf().toISOString().slice(0, 16);
  };
  const consoleLoggerOptions = ConsoleLogger.getDefaultConfig();
  const fileLoggerOptions = getDefaultFileLoggerOptions();
  const postsPublishedAfter = __convertPublishDate(
    p.include.postsPublished.after
  );
  const postsPublishedBefore = __convertPublishDate(
    p.include.postsPublished.before
  );
  const productsPublishedAfter = __convertPublishDate(
    p.include.productsPublished.after
  );
  const productsPublishedBefore = __convertPublishDate(
    p.include.productsPublished.before
  );
  let maxVideoResolution: MaxVideoResolution;
  try {
    maxVideoResolution = normalizeMaxVideoResolution(p.maxVideoResolution);
  } catch (_) {
    maxVideoResolution = "none";
  }

  // Ensure deprecated stopOn values not used
  const stopOn = p.stopOn === 'postPreviouslyDownloaded' ? 'previouslyDownloaded'
    : p.stopOn === 'postPublishDateOutOfRange' ? 'publishDateOutOfRange'
    : p.stopOn;

  const conf: UIConfig = {
    downloader: {
      target: {
        inputMode: "browser",
        browserValue: null,
        manualValue: ""
      },
      cookie: {
        inputMode: "browser",
        browserValue: null,
        manualValue: ""
      },
      "path.to.ffmpeg": p.pathToFFmpeg || "",
      "path.to.deno": p.pathToDeno || "",
      "max.video.resolution": maxVideoResolution,
      "use.status.cache": p.useStatusCache,
      "stop.on": stopOn,
      "no.prompt": false,
      "dry.run": p.dryRun
    },
    output: {
      "out.dir": defaultOutputPath,
      "campaign.dir.name.format": p.dirNameFormat.campaign,
      "content.dir.name.format": p.dirNameFormat.content,
      "media.filename.format": p.filenameFormat.media,
      "content.file.exists.action": p.fileExistsAction.content,
      "info.file.exists.action": p.fileExistsAction.info,
      "info.api.file.exists.action": p.fileExistsAction.infoAPI
    },
    include: {
      "locked.content": p.include.lockedContent,
      "campaign.info": p.include.lockedContent,
      "content.info": p.include.contentInfo,
      "content.media": {
        type:
          typeof p.include.contentMedia === "boolean" ?
            p.include.contentMedia
          : "custom",
        custom:
          typeof p.include.contentMedia === "boolean" ?
            []
          : p.include.contentMedia
      },
      "preview.media": {
        type:
          typeof p.include.previewMedia === "boolean" ?
            p.include.previewMedia
          : "custom",
        custom:
          typeof p.include.previewMedia === "boolean" ?
            []
          : p.include.previewMedia
      },
      "all.media.variants": p.include.allMediaVariants,
      "media.thumbnails": p.include.mediaThumbnails,
      "images.by.filename": p.include.mediaByFilename.images || "",
      "audio.by.filename": p.include.mediaByFilename.audio || "",
      "attachments.by.filename": p.include.mediaByFilename.attachments || "",
      "posts.in.tier": {
        type: p.include.postsInTier === "any" ? "any" : "custom",
        custom: p.include.postsInTier === "any" ? [] : p.include.postsInTier
      },
      "posts.with.media.type": {
        type:
          typeof p.include.postsWithMediaType === "string" ?
            p.include.postsWithMediaType
          : "custom",
        custom:
          typeof p.include.postsWithMediaType === "string" ?
            []
          : p.include.postsWithMediaType
      },
      "posts.published": {
        type:
          postsPublishedAfter && postsPublishedBefore ? "between"
          : postsPublishedAfter ? "after"
          : postsPublishedBefore ? "before"
          : "anytime",
        after: postsPublishedAfter,
        before: postsPublishedBefore
      },
      "products.published": {
        type:
          productsPublishedAfter && productsPublishedBefore ? "between"
          : productsPublishedAfter ? "after"
          : productsPublishedBefore ? "before"
          : "anytime",
        after: productsPublishedAfter,
        before: productsPublishedBefore
      },
      comments: p.include.comments
    },
    request: {
      "max.retries": p.request.maxRetries,
      "max.concurrent": p.request.maxConcurrent,
      "min.time": p.request.minTime,
      "proxy.url": p.request.proxy?.url ?? "",
      "proxy.reject.unauthorized.tls":
        p.request.proxy?.rejectUnauthorizedTLS ?? true
    },
    "embed.downloader.youtube": {
      type: "default",
      exec: ""
    },
    "embed.downloader.vimeo": {
      type: "custom",
      exec: "",
      "helper.ytdlp.path": "",
      "helper.password": "",
      "helper.ytdlp.args": ""
    },
    "embed.downloader.sproutvideo": {
      type: "custom",
      exec: "",
      "helper.ytdlp.path": "",
      "helper.password": "",
      "helper.ytdlp.args": ""
    },
    "logger.console": {
      enabled: consoleLoggerOptions.enabled,
      "log.level": consoleLoggerOptions.logLevel,
      "include.date.time": consoleLoggerOptions.include.dateTime,
      "include.level": consoleLoggerOptions.include.level,
      "include.originator": consoleLoggerOptions.include.originator,
      "include.error.stack": consoleLoggerOptions.include.errorStack,
      "date.time.format": consoleLoggerOptions.dateTimeFormat,
      color: consoleLoggerOptions.color
    },
    "logger.file.1": {
      enabled: fileLoggerOptions.enabled,
      "log.level": fileLoggerOptions.logLevel,
      "log.dir": fileLoggerOptions.logDir,
      "log.filename": fileLoggerOptions.logFilename,
      "file.exists.action": fileLoggerOptions.fileExistsAction,
      "include.date.time": fileLoggerOptions.include.dateTime,
      "include.level": fileLoggerOptions.include.level,
      "include.originator": fileLoggerOptions.include.originator,
      "include.error.stack": fileLoggerOptions.include.errorStack,
      "date.time.format": fileLoggerOptions.dateTimeFormat,
      color: fileLoggerOptions.color
    },
    "patreon.dl.gui": {
      "connect.youtube": false
    },
    "support.data": {
      browserObtainedValues: {
        target: null,
        cookie: null,
        tiers: null
      },
      appliedProxySettings: {
        url: p.request.proxy?.url ?? "",
        rejectUnauthorizedTLS: p.request.proxy?.rejectUnauthorizedTLS ?? true
      },
      bootstrapData: null
    }
  };
  for (const { provider, exec } of p.embedDownloaders) {
    switch (provider.toLowerCase()) {
      case "youtube":
        conf["embed.downloader.youtube"]["exec"] = exec;
        if (exec) {
          conf["embed.downloader.youtube"]["type"] = "custom";
        }
        break;
      case "vimeo":
        conf["embed.downloader.vimeo"]["exec"] = exec;
        break;
      case "sproutvideo":
        conf["embed.downloader.sproutvideo"]["exec"] = exec;
        break;
    }
  }
  return conf;
}
