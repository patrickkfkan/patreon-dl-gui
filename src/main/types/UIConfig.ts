import type { FileExistsAction, LogLevel, StopOnCondition } from "patreon-dl";
import type { ObjectKeysByValueType } from "../../common/types/Utility";

export interface Tier {
  id: string;
  title: string;
}

export interface PageInfo {
  url: string | null;
  title: string | null;
  pageDescription: string;
  tiers: Tier[] | null;
  cookie: string | null;
  cookieDescription: string;
}

export interface BrowserObtainableInput {
  inputMode: "manual" | "browser";
  manualValue: string;
  browserValue: BrowserObtainedValue | null;
}

export interface BrowserObtainedValue {
  value: string;
  description: string;
}

export type CustomSelectionValue<
  T extends boolean | string,
  V extends string
> = {
  type: T | "custom";
  custom: V[];
};

export type MaxVideoResolution =
  | "none"
  | "360p"
  | "480p"
  | "720p"
  | "1080p"
  | "1440p"
  | "2160p";

export interface UIConfig {
  downloader: {
    target: BrowserObtainableInput;
    cookie: BrowserObtainableInput;
    "path.to.ffmpeg": string;
    "path.to.deno": string;
    "max.video.resolution": MaxVideoResolution;
    "use.status.cache": boolean;
    "stop.on": StopOnCondition;
    "no.prompt": boolean;
    "dry.run": boolean;
  };
  output: {
    "out.dir": string;
    "campaign.dir.name.format": string;
    "content.dir.name.format": string;
    "media.filename.format": string;
    "content.file.exists.action": FileExistsAction;
    "info.file.exists.action": FileExistsAction;
    "info.api.file.exists.action": FileExistsAction;
  };
  include: {
    "locked.content": boolean;
    "campaign.info": boolean;
    "content.info": boolean;
    "content.media": CustomSelectionValue<
      boolean,
      "image" | "video" | "audio" | "attachment" | "file"
    >;
    "preview.media": CustomSelectionValue<boolean, "image" | "video" | "audio">;
    "all.media.variants": boolean;
    "images.by.filename": string;
    "audio.by.filename": string;
    "attachments.by.filename": string;
    "posts.in.tier": CustomSelectionValue<"any", string>;
    "posts.with.media.type": CustomSelectionValue<
      "any" | "none",
      "image" | "video" | "audio" | "attachment" | "podcast"
    >;
    "posts.published": {
      type: "anytime" | "after" | "before" | "between";
      after: string;
      before: string;
    };
    comments: boolean;
  };
  request: {
    "max.retries": number;
    "max.concurrent": number;
    "min.time": number;
    "proxy.url": string;
    "proxy.reject.unauthorized.tls": boolean;
  };
  "embed.downloader.youtube": {
    type: "default" | "custom";
    exec: string;
  };
  "embed.downloader.vimeo": {
    type: "helper" | "custom";
    exec: string;
    // Helper params
    "helper.ytdlp.path": string;
    "helper.password": string;
    "helper.ytdlp.args": string;
  };
  "logger.console": {
    enabled: boolean;
    "log.level": LogLevel;
    "include.date.time": boolean;
    "include.level": boolean;
    "include.originator": boolean;
    "include.error.stack": boolean;
    "date.time.format": string;
    color: boolean;
  };
  "logger.file.1": {
    enabled: boolean;
    "log.level": LogLevel;
    "log.dir": string;
    "log.filename": string;
    "file.exists.action": "append" | "overwrite";
    "include.date.time": boolean;
    "include.level": boolean;
    "include.originator": boolean;
    "include.error.stack": boolean;
    "date.time.format": string;
    color: boolean;
  };
  "patreon.dl.gui": {
    "connect.youtube": boolean;
  };
  "support.data": {
    browserObtainedValues: {
      target: BrowserObtainedValue | null;
      cookie: BrowserObtainedValue | null;
      tiers: Tier[] | null;
    };
    appliedProxySettings: {
      url: string;
      rejectUnauthorizedTLS: boolean;
    };
  };
}

export type UIConfigSection = keyof UIConfig;

export type UIConfigValuesByType<
  S extends UIConfigSection,
  T
> = ObjectKeysByValueType<UIConfig[S], T>;

export type UIConfigByValueType<T> = {
  [K in keyof UIConfig as UIConfigValuesByType<K, T> extends never ? never
  : K]: UIConfigValuesByType<K, T>;
};

export type UIConfigProp<
  S extends UIConfigSectionWithPropsOf<T>,
  T
> = UIConfigByValueType<T>[S];
export type UIConfigSectionWithPropsOf<T> = keyof UIConfigByValueType<T>;
export type UIConfigSectionPropTuple<S extends UIConfigSection, T> = [
  S,
  UIConfigValuesByType<S, T>
];
