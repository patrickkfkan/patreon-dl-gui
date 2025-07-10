import { useState } from "react";
import { Tooltip } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css";
import _ from "lodash";

interface HelpIconProps {
  tooltip: string;
  className?: string;
}

function HelpIcon(
  props: HelpIconProps
) {
  const [id] = useState(_.uniqueId("tooltip-trigger-"));
  const { tooltip, className } = props;

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
      >
        <div style={{ maxWidth: "16rem" }}>
          {tooltip}
        </div>
      </Tooltip>
    </>
  );
}

export default HelpIcon;
