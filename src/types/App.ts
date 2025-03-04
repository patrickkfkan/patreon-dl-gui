import type { UIConfig } from "./UIConfig";

export interface Editor {
  id: number;
  name: string;
  filePath: string | null;
  config: UIConfig;
  modified: boolean;
  loadAlerts?: AlertMessage[];
  promptOnSave: boolean;
}

export interface AlertMessage {
  type: "warn" | "error";
  text: string;
}
