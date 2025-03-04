import { useEditor } from "../../../ui/contexts/EditorContextProvider";
import { useCommands } from "../../../ui/contexts/CommandsProvider";
import type { UIConfig, UIConfigSection } from "../../../types/UIConfig";
import { useCallback, useState } from "react";
import { Tooltip } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css";
import _ from "lodash";

interface HelpIconProps<
  S extends UIConfigSection,
  P extends keyof UIConfig[S]
> {
  config?: [S, P] | null;
  tooltip: string;
  className?: string;
}

function HelpIcon<S extends UIConfigSection, P extends keyof UIConfig[S]>(
  props: HelpIconProps<S, P>
) {
  const [id] = useState(_.uniqueId("tooltip-trigger-"));
  const { showHelpIcons } = useEditor();
  const { requestHelp } = useCommands();
  const { config, tooltip, className } = props;

  const getMoreInfo = useCallback(() => {
    if (!config) {
      return;
    }
    requestHelp(...config);
  }, [config]);

  if (!showHelpIcons) {
    return null;
  }

  const moreInfoLink = config ? (
    <a
      href="#"
      className="text-info link-underline link-underline-opacity-0 ms-1"
      onClick={getMoreInfo}
      aria-label="More information"
    >
      More info.
    </a>
  ) : null;

  return (
    <>
      <a
        href="#"
        className={`fs-5 material-icons text-info link-underline link-underline-opacity-0 ${className || ""}`}
        id={id}
        aria-label={tooltip}
      >
        help
      </a>
      <Tooltip
        style={{ zIndex: 9999 }}
        place="top"
        anchorSelect={`#${id}`}
        clickable
      >
        <div style={{ maxWidth: "16rem" }}>
          {tooltip}
          {moreInfoLink}
        </div>
      </Tooltip>
    </>
  );
}

export default HelpIcon;
