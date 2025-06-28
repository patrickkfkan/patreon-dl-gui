import type { UIConfig, UIConfigSection } from "../../../types/UIConfig";
import HelpIcon from "./HelpIcon";

export type AccessibilityProps = {
  ariaLabel?: string | null;
};

export type HelpProps =
  | {
      helpTooltip?: undefined | null;
      helpHasMoreInfo?: undefined | null;
    }
  | {
      helpTooltip: string;
      helpHasMoreInfo?: boolean | null;
    };

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
