import type { CustomSelectionValue, UIConfig } from "./types/UIConfig";
import { convertUIConfigToFileContents } from "./config/FileConfig";
import DownloaderConsoleLogger from "./DownloaderConsoleLogger";
import type {
  ConsoleLoggerOptions,
  DownloaderOptions,
  FileLoggerOptions,
  FileLoggerType
} from "patreon-dl";
import { ChainLogger, ConsoleLogger, DateTime, FileLogger } from "patreon-dl";
import { getDefaultFileLoggerOptions } from "./util/Config";
import YouTubeConfigurator, { YT_CREDS_PATH } from "./util/YouTubeConfigurator";
import {
  VIMEO_HELPER_SCRIPT_EXEC_ARGS,
  VIMEO_HELPER_SCRIPT_PATH
} from "./Constants";
import { Shescape } from "shescape";

const shescape = new Shescape({ shell: process.platform === 'darwin' ? 'zsh' : true });

export function convertUIConfigToPatreonDLOptions(uiConfig: UIConfig) {
  const targetURL = uiConfig.downloader.target.browserValue?.value;
  if (!targetURL) {
    throw Error("No target URL");
  }

  const fileConfig = convertUIConfigToFileContents(uiConfig);

  const downloaderOptions: DownloaderOptions = {
    cookie: fileConfig.downloader["cookie"],
    pathToFFmpeg: fileConfig.downloader["path.to.ffmpeg"],
    pathToYouTubeCredentials:
      (
        uiConfig["embed.downloader.youtube"].type === "default" &&
        uiConfig["patreon.dl.gui"]["connect.youtube"] &&
        YouTubeConfigurator.getConnectionStatus().isConnected
      ) ?
        YT_CREDS_PATH
      : undefined,
    useStatusCache: uiConfig.downloader["use.status.cache"],
    stopOn: uiConfig.downloader["stop.on"],
    dryRun: uiConfig.downloader["dry.run"],
    outDir: fileConfig.output["out.dir"],
    dirNameFormat: {
      campaign: fileConfig.output["campaign.dir.name.format"],
      content: fileConfig.output["content.dir.name.format"]
    },
    filenameFormat: {
      media: fileConfig.output["media.filename.format"]
    },
    fileExistsAction: {
      content: uiConfig.output["content.file.exists.action"],
      info: uiConfig.output["info.file.exists.action"],
      infoAPI: uiConfig.output["info.api.file.exists.action"]
    },
    include: {
      lockedContent: uiConfig.include["locked.content"],
      campaignInfo: uiConfig.include["campaign.info"],
      contentInfo: uiConfig.include["content.info"],
      contentMedia: fromCustomSelectionValue(uiConfig.include["content.media"]),
      previewMedia: fromCustomSelectionValue(uiConfig.include["preview.media"]),
      allMediaVariants: uiConfig.include["all.media.variants"],
      mediaByFilename: {
        images: fileConfig.include["images.by.filename"],
        audio: fileConfig.include["audio.by.filename"],
        attachments: fileConfig.include["attachments.by.filename"]
      },
      postsInTier: fromCustomSelectionValue(uiConfig.include["posts.in.tier"]),
      postsWithMediaType: fromCustomSelectionValue(
        uiConfig.include["posts.with.media.type"]
      ),
      postsPublished: {
        after: toDateTime(fileConfig.include["posts.published.after"]),
        before: toDateTime(fileConfig.include["posts.published.before"])
      },
      comments: uiConfig.include.comments
    },
    request: {
      maxRetries: uiConfig.request["max.retries"],
      maxConcurrent: uiConfig.request["max.concurrent"],
      minTime: uiConfig.request["min.time"],
      proxy:
        uiConfig.request["proxy.url"].trim() ?
          {
            url: uiConfig.request["proxy.url"].trim(),
            rejectUnauthorizedTLS:
              uiConfig.request["proxy.reject.unauthorized.tls"]
          }
        : null
    }
  };

  const embedDownloaders: DownloaderOptions["embedDownloaders"] = [];
  if (
    uiConfig["embed.downloader.youtube"].type === "custom" &&
    uiConfig["embed.downloader.youtube"].exec.trim()
  ) {
    embedDownloaders.push({
      provider: "youtube",
      exec: uiConfig["embed.downloader.youtube"].exec.trim()
    });
  }
  if (uiConfig["embed.downloader.vimeo"].type === "helper") {
    embedDownloaders.push({
      provider: "vimeo",
      exec: getVimeoHelperExec(uiConfig["embed.downloader.vimeo"])
    });
  } else if (uiConfig["embed.downloader.vimeo"].exec.trim()) {
    embedDownloaders.push({
      provider: "vimeo",
      exec: uiConfig["embed.downloader.vimeo"].exec.trim()
    });
  }
  if (embedDownloaders.length > 0) {
    downloaderOptions.embedDownloaders = embedDownloaders;
  }

  const consoleLoggerOptions: ConsoleLoggerOptions = {
    ...ConsoleLogger.getDefaultConfig(),
    enabled: uiConfig["logger.console"].enabled,
    logLevel: uiConfig["logger.console"]["log.level"],
    include: {
      dateTime: uiConfig["logger.console"]["include.date.time"],
      level: uiConfig["logger.console"]["include.level"],
      originator: uiConfig["logger.console"]["include.originator"],
      errorStack: uiConfig["logger.console"]["include.error.stack"]
    },
    dateTimeFormat: fileConfig["logger.console"]["date.time.format"],
    color: uiConfig["logger.console"].color
  };

  const consoleLogger = new DownloaderConsoleLogger(consoleLoggerOptions);

  const fileLoggerOptions: FileLoggerOptions<FileLoggerType.Downloader> = {
    ...getDefaultFileLoggerOptions(),
    init: {
      targetURL,
      outDir: fileConfig.output["out.dir"]
    },
    enabled: uiConfig["logger.file.1"].enabled,
    logLevel: uiConfig["logger.file.1"]["log.level"],
    logDir: fileConfig["logger.file.1"]["log.dir"],
    logFilename: fileConfig["logger.file.1"]["log.filename"],
    fileExistsAction: uiConfig["logger.file.1"]["file.exists.action"],
    include: {
      dateTime: uiConfig["logger.file.1"]["include.date.time"],
      level: uiConfig["logger.file.1"]["include.level"],
      originator: uiConfig["logger.file.1"]["include.originator"],
      errorStack: uiConfig["logger.file.1"]["include.error.stack"]
    },
    dateTimeFormat: fileConfig["logger.file.1"]["date.time.format"],
    color: uiConfig["logger.file.1"].color
  };

  const fileLogger = new FileLogger(
    fileLoggerOptions
  );

  downloaderOptions.logger = new ChainLogger([consoleLogger, fileLogger]);

  const prompt = !uiConfig.downloader["no.prompt"];

  return {
    targetURL,
    downloaderOptions,
    consoleLogger,
    fileLogger,
    prompt
  };
}

function fromCustomSelectionValue<T extends boolean | string, V extends string>(
  value: CustomSelectionValue<T, V>
) {
  if (value.type === "custom") {
    return value.custom;
  }
  return value.type;
}

function toDateTime(value: string): DateTime | null {
  if (!value) {
    return null;
  }
  try {
    return DateTime.from(value);
  } catch (error: unknown) {
    console.error(
      `Could not convert "${value}" to DateTime: ${error instanceof Error ? error.message : error}`
    );
    return null;
  }
}

function getVimeoHelperExec(config: UIConfig["embed.downloader.vimeo"]) {
  const args = [...VIMEO_HELPER_SCRIPT_EXEC_ARGS];
  if (config["helper.ytdlp.path"].trim()) {
    args.push("--yt-dlp", shescape.quote(config["helper.ytdlp.path"].trim()));
  }
  if (config["helper.password"].trim()) {
    args.push(
      "--video-password",
      shescape.quote(config["helper.password"].trim())
    );
  }
  return [shescape.quote(VIMEO_HELPER_SCRIPT_PATH), ...args].join(" ");
}
