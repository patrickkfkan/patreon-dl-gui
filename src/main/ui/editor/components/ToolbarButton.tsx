import { Button, ButtonGroup, Dropdown } from "react-bootstrap";

interface ToolbarButtonProps {
  icon: string;
  className?: string;
  iconClassName?: string;
  onClick: () => void;
  tooltip: string;
  split?: {
    label: string;
    onClick: () => void;
  }[];
  disabled?: boolean;
}

function ToolbarButton(props: ToolbarButtonProps) {
  const { icon, className, iconClassName, onClick, tooltip, split, disabled } =
    props;
  const buttonClasses = !split ? `mx-1 ${className || ""}` : className;
  const button = (
    <Button
      size="sm"
      className={buttonClasses}
      title={tooltip}
      onClick={onClick}
      aria-label={tooltip}
      disabled={disabled}
    >
      <span
        className={`material-symbols-outlined ${iconClassName || ""}`}
        style={{ lineHeight: "inherit" }}
      >
        {icon}
      </span>
    </Button>
  );
  if (!split || split.length === 0) {
    return button;
  }
  const dropdownItems = split.map(({ label, onClick }) => (
    <Dropdown.Item key={`${icon}-split-${label}`} href="#" onClick={onClick}>
      {label}
    </Dropdown.Item>
  ));

  return (
    <Dropdown as={ButtonGroup} className={`mx-1`}>
      {button}
      <Dropdown.Toggle
        split
        size="sm"
        className={className}
        disabled={disabled}
      />
      <Dropdown.Menu>{dropdownItems}</Dropdown.Menu>
    </Dropdown>
  );
}

export default ToolbarButton;
