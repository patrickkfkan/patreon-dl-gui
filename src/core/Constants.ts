import { app } from "electron";
import envPaths from "env-paths";

export const APP_DATA_PATH = envPaths(app.getName(), {
  suffix: "electron"
}).data;

export const APP_URL = "https://github.com/patrickkfkan/patreon-dl-gui";

export const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0";
export const PATREON_URL = "https://www.patreon.com";

export const FILE_CONFIG_SECTION_PROPS = {
  downloader: [
    "target.url",
    "cookie",
    "use.status.cache",
    "stop.on",
    "no.prompt",
    "dry.run",
    "path.to.ffmpeg"
  ],
  output: [
    "out.dir",
    "campaign.dir.name.format",
    "content.dir.name.format",
    "media.filename.format",
    "content.file.exists.action",
    "info.file.exists.action",
    "info.api.file.exists.action"
  ],
  include: [
    "locked.content",
    "posts.in.tier",
    "posts.with.media.type",
    "posts.published.after",
    "posts.published.before",
    "campaign.info",
    "content.info",
    "content.media",
    "preview.media",
    "all.media.variants",
    "images.by.filename",
    "audio.by.filename",
    "attachments.by.filename",
    "comments"
  ],
  request: [
    "max.retries",
    "max.concurrent",
    "min.time",
    "proxy.url",
    "proxy.reject.unauthorized.tls"
  ],
  "embed.downloader.youtube": ["exec"],
  "embed.downloader.vimeo": ["exec"],
  "logger.console": [
    "enabled",
    "log.level",
    "include.date.time",
    "include.level",
    "include.originator",
    "include.error.stack",
    "date.time.format",
    "color"
  ],
  "logger.file.1": [
    "enabled",
    "log.dir",
    "log.filename",
    "file.exists.action",
    "log.level",
    "include.date.time",
    "include.level",
    "include.originator",
    "include.error.stack",
    "date.time.format",
    "color"
  ]
} as const;
