import path from "path";
import fs from "fs-extra";
import { YouTubeCredentialsCapturer } from "patreon-dl";
import { EventEmitter } from "events";
import { APP_DATA_PATH } from "../../common/Constants";
import { getErrorString } from "../../common/util/Misc";

export const YT_CREDS_PATH = path.join(
  APP_DATA_PATH,
  "/YouTubeCredentials.json"
);

export interface YouTubeConnectionStatus {
  isConnected: boolean;
}

export interface YouTubeConnectVerificationInfo {
  verificationURL: string;
  code: string;
}

export type YouTubeConnectResult =
  | {
      status: "success";
      credentialsPath: string;
    }
  | {
      status: "error";
      error: string;
    };

export default class YouTubeConfigurator extends EventEmitter {
  #capturer: YouTubeCredentialsCapturer;

  constructor() {
    super();
    this.#capturer = new YouTubeCredentialsCapturer();
  }

  startConnect() {
    this.#capturer.on("pending", (data) => {
      this.emit("verificationInfo", {
        verificationURL: data.verificationURL,
        code: data.code
      });
    });
    this.#capturer.on("capture", (credentials) => {
      try {
        fs.writeJSONSync(YT_CREDS_PATH, credentials);
        this.emit("end", {
          status: "success",
          credentialsPath: YT_CREDS_PATH
        });
      } catch (error: unknown) {
        console.error(
          `Error saving credentials to "${YT_CREDS_PATH}": `,
          getErrorString(error)
        );
        this.emit("end", {
          status: "error",
          error: getErrorString(error)
        });
      } finally {
        this.endConnect();
      }
    });
    this.#capturer.begin();
  }

  endConnect() {
    this.#capturer.removeAllListeners();
  }

  resetConnectionStatus() {
    try {
      if (fs.existsSync(YT_CREDS_PATH)) {
        fs.unlinkSync(YT_CREDS_PATH);
      }
    } catch (error: unknown) {
      console.error(
        `Error deleting YouTube credentials file "${YT_CREDS_PATH}`,
        getErrorString(error)
      );
    }
  }

  static getConnectionStatus(): YouTubeConnectionStatus {
    return { isConnected: fs.existsSync(YT_CREDS_PATH) };
  }

  emit(eventName: "end", result: YouTubeConnectResult): boolean;
  emit(
    eventName: "verificationInfo",
    info: YouTubeConnectVerificationInfo
  ): boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  emit(eventName: string | symbol, ...args: any[]): boolean {
    return super.emit(eventName, ...args);
  }

  on(eventName: "end", listener: (result: YouTubeConnectResult) => void): this;
  on(
    eventName: "verificationInfo",
    listener: (info: YouTubeConnectVerificationInfo) => void
  ): this;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(eventName: string | symbol, listener: (...args: any[]) => void): this {
    return super.on(eventName, listener);
  }
}
