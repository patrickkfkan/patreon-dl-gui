import type { UIConfig } from "../../types/UIConfig";
import type { DateTime } from "patreon-dl";
import {
  ConsoleLogger,
  getDefaultDownloaderOptions,
  type DeepRequired,
  type DownloaderOptions
} from "patreon-dl";
import { getDefaultFileLoggerOptions } from "../util/Config";

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
      "use.status.cache": p.useStatusCache,
      "stop.on": p.stopOn,
      "no.prompt": false,
      "dry.run": p.dryRun
    },
    output: {
      "out.dir": p.outDir,
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
      exec: ""
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
    "support.data": {
      browserObtainedValues: {
        target: null,
        cookie: null,
        tiers: null
      },
      appliedProxySettings: {
        url: p.request.proxy?.url ?? "",
        rejectUnauthorizedTLS: p.request.proxy?.rejectUnauthorizedTLS ?? true
      }
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
        conf["embed.downloader.youtube"]["exec"] = exec;
        break;
    }
  }
  return conf;
}
