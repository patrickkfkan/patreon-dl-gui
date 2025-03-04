import { DateTime } from "patreon-dl";

const NO_CLEAN = [DateTime];

export default class ObjectHelper {
  static clean(
    obj: object,
    opts?: {
      deep?: boolean;
      cleanNulls?: boolean;
      cleanEmptyObjects?: boolean;
    }
  ) {
    const deep = opts?.deep || false;
    const cleanNulls = opts?.cleanNulls || false;
    const cleanEmptyObjects = opts?.cleanEmptyObjects || false;

    if (!obj || typeof obj !== "object") {
      return obj;
    }
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      const skip = v === undefined || (v === null && cleanNulls);
      if (!skip) {
        if (
          v !== null &&
          typeof v === "object" &&
          !NO_CLEAN.find((nc) => v instanceof nc)
        ) {
          const c = deep ? this.clean(v, opts) : v;
          if (Object.entries(c).length > 0 || !cleanEmptyObjects) {
            result[k] = c;
          }
        } else {
          result[k] = v;
        }
      }
    }
    return Array.isArray(obj) ? Object.values(result) : result;
  }
}
