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
