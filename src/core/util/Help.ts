import { existsSync, readFileSync } from "fs";
import type { UIConfig, UIConfigSection } from "../../types/UIConfig";
import path from "path";

export function getHelpContents<S extends UIConfigSection>(
  section: S,
  prop: keyof UIConfig[S]
) {
  const filePath = path.join(
    __dirname,
    `/assets/help/${section}/${String(prop)}.md`
  );
  if (!existsSync(filePath)) {
    throw Error(
      `Could not read help file for [${section}] ${String(prop)}: ${filePath} does not exist`
    );
  }
  return readFileSync(filePath).toString();
}
