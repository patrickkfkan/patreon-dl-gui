import { existsSync, readFileSync } from "fs";
import type { UIConfig, UIConfigSection } from "../types/UIConfig";
import path from "path";
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function getHelpContents<S extends UIConfigSection>(
  section: S,
  prop: keyof UIConfig[S]
) {
  const filePath = path.resolve(
    __dirname,
    `assets/main/help/${section}/${String(prop)}.md`
  );
  if (!existsSync(filePath)) {
    throw Error(
      `Could not read help file for [${section}] ${String(prop)}: ${filePath} does not exist`
    );
  }
  return readFileSync(filePath).toString();
}
