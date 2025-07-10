import type { ConsoleLoggerOptions, LogEntry, LogLevel } from "patreon-dl";
import { ConsoleLogger, FetcherError } from "patreon-dl";
import { encode } from "html-entities";
import dateFormat from "dateformat";
import EventEmitter from "events";

export interface DownloaderLogMessage {
  text: string;
  level: LogLevel;
}

export default class DownloaderConsoleLogger extends ConsoleLogger {
  #eventEmitter: EventEmitter;

  constructor(options?: ConsoleLoggerOptions) {
    super();
    this.setOptions(options);
    this.#eventEmitter = new EventEmitter();
  }

  protected errorToStrings(m: Error, forceNoStack = false): string[] {
    const result: string[] = [];
    const msg = encode(m.cause ? `${m.message}:` : m.message);
    if (m.name !== "Error") {
      result.push(encode(`(${m.name}) ${msg}`));
    } else {
      result.push(encode(msg));
    }
    if (m.cause instanceof Error) {
      result.push(...this.errorToStrings(m.cause, true));
    } else if (m.cause) {
      result.push(encode(m.cause as string));
    }
    if (m instanceof FetcherError) {
      result.push(encode(`(${m.method}: ${m.url})`));
    }
    if (m.stack && this.config.include.errorStack && !forceNoStack) {
      result.push(encode(m.stack));
    }
    return result;
  }

  protected toStrings(entry: LogEntry): string[] {
    const { level, originator, message } = entry;
    const strings = message.reduce<string[]>((result, m) => {
      if (m instanceof Error) {
        result.push(...this.errorToStrings(m));
      } else if (typeof m === "object") {
        result.push(encode(JSON.stringify(m, null, 2)));
      } else {
        result.push(encode(m));
      }

      return result;
    }, []);

    if (originator && this.config.include.originator) {
      strings.unshift(this.colorize(encode(`${originator}:`), "originator"));
    }

    if (this.config.include.level) {
      strings.unshift(this.colorize(encode(`${level}:`), level));
    }

    if (this.config.include.dateTime) {
      const dateTimeStr = encode(
        `${dateFormat(new Date(), this.config.dateTimeFormat)}:`
      );
      strings.unshift(dateTimeStr);
    }

    return strings;
  }

  protected colorize(value: string, colorKey: string) {
    if (this.config.color) {
      switch (colorKey) {
        case "error":
          return `<span class="fw-bold" style="color: red;">${value}</span>`;
        case "warn":
          return `<span style="color: magenta;">${value}</span>`;
        case "info":
          return `<span style="color: green;">${value}</span>`;
        case "debug":
          return `<span style="color: yellow;">${value}</span>`;
        case "originator":
          return `<span style="color: blue;">${value}</span>`;
      }
    }
    return `<span style="color: whitesmoke;">${value}</span>`;
  }

  protected toOutput(level: LogLevel, msg: string[]) {
    this.emit("message", {
      text: msg.join(" "),
      level
    });
  }

  on(event: "message", listener: (message: DownloaderLogMessage) => void) {
    this.#eventEmitter.on(event, listener);
  }

  emit(event: "message", message: DownloaderLogMessage) {
    this.#eventEmitter.emit(event, message);
  }

  removeAllListeners() {
    this.#eventEmitter.removeAllListeners();
  }
}
