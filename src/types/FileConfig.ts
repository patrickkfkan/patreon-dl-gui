import type { FILE_CONFIG_SECTION_PROPS } from "../core/Constants";

export type FileConfigSection = keyof typeof FILE_CONFIG_SECTION_PROPS;
export type FileConfigProp<S extends FileConfigSection> =
  (typeof FILE_CONFIG_SECTION_PROPS)[S][number];
export type FileConfigContents = {
  [S in FileConfigSection]: {
    [P in FileConfigProp<S>]: string;
  };
};

export interface FileConfig<T extends "hasPath" | "" = ""> {
  editorId: number;
  name: string;
  filePath: T extends "hasPath" ? string : string | null;
  contents: string;
}
