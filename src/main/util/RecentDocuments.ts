import fs from "fs-extra";
import path from "path";
import { APP_DATA_PATH } from "../../common/Constants";

const MAX_ENTRIES = 10;

export type RecentDocument = {
  name: string;
  filePath: string;
};

export default class RecentDocuments {
  static #dataFilePath: string;
  static #data: RecentDocument[];
  static #status: "ready" | null = null;

  static #load() {
    if (this.#status !== null) {
      return;
    }
    const filePath = path.join(APP_DATA_PATH, "/RecentDocuments.json");
    let data: RecentDocument[] = [];
    try {
      if (!fs.existsSync(filePath)) {
        fs.writeJsonSync(filePath, data);
      } else {
        const _data = fs.readJSONSync(filePath);
        if (
          _data &&
          Array.isArray(_data) &&
          _data.every((value) => this.#isRecentDocument(value))
        ) {
          data = _data;
        } else {
          console.warn(
            "Recent documents have unexpected data structure - resetting it."
          );
          fs.writeJsonSync(filePath, data);
        }
      }
    } catch (error: unknown) {
      console.error(
        "Failed to load recent documents:",
        error instanceof Error ? error.message : String(error)
      );
    } finally {
      this.#dataFilePath = filePath;
      this.#data = data;
      this.#status = "ready";
    }
  }

  static #save() {
    try {
      fs.writeJSONSync(this.#dataFilePath, this.#data);
    } catch (error: unknown) {
      console.error(
        "Failed to write recent documents to file:",
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  static add(entry: RecentDocument) {
    this.#load();
    const i = this.#data.findIndex((value) => this.#isEqual(value, entry));
    if (i >= 0) {
      this.#data.splice(i, 1);
    }
    this.#data.unshift(entry);
    if (this.#data.length > MAX_ENTRIES) {
      this.#data.splice(MAX_ENTRIES);
    }
    this.#save();
  }

  static clear() {
    this.#load();
    this.#data.splice(0);
    this.#save();
  }

  static list(): readonly RecentDocument[] {
    this.#load();
    return this.#data;
  }

  static #isRecentDocument(value: unknown): value is RecentDocument {
    return (
      !!value &&
      typeof value === "object" &&
      Reflect.has(value, "name") &&
      Reflect.has(value, "filePath")
    );
  }

  static #isEqual(o1: RecentDocument, o2: RecentDocument) {
    return o1.filePath === o2.filePath;
  }
}
