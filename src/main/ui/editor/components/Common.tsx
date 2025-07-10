import type { UIConfig, UIConfigSection } from "../../../types/UIConfig";
import type { HelpProps } from "../../../../common/ui";
import HelpIcon from "./HelpIcon";

export type CreateHelpIconArgs<S extends UIConfigSection> = HelpProps & {
  config: [S, keyof UIConfig[S]];
  className?: string;
};

export function createHelpIcon<S extends UIConfigSection>(
  args: CreateHelpIconArgs<S>
) {
  const { helpTooltip, helpHasMoreInfo, config, className } = args;
  if (!helpTooltip) {
    return null;
  }
  return (
    <HelpIcon
      tooltip={helpTooltip}
      config={helpHasMoreInfo ? config : null}
      className={className || "ms-2"}
    />
  );
}
