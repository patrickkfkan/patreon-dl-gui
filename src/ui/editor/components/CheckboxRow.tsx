import type {
  UIConfig,
  UIConfigSectionPropTuple,
  UIConfigSectionWithPropsOf
} from "../../../types/UIConfig";
import { useConfig } from "../../contexts/ConfigProvider";
import { Col, Form, Row } from "react-bootstrap";
import type { AccessibilityProps, HelpProps } from "./Common";
import { createHelpIcon } from "./Common";
import type { JSX } from "react";

type CheckboxRowProps<S extends UIConfigSectionWithPropsOf<boolean>> = {
  config: UIConfigSectionPropTuple<S, boolean>;
  label: string;
  onChange?: (value: boolean) => void;
  appendElements?: JSX.Element[];
} & HelpProps &
  AccessibilityProps;

function CheckboxRow<S extends UIConfigSectionWithPropsOf<boolean>>(
  props: CheckboxRowProps<S>
) {
  const { config, setConfigValue } = useConfig();
  const { config: pConfig, label, ariaLabel, onChange, appendElements = [] } = props;
  const [section, prop] = pConfig;
  const value = config[section][prop] as boolean;

  return (
    <Row className="align-items-center py-1">
      <Col xs={4}>{label}:</Col>
      <Col className="d-flex align-items-center">
        <Form.Check
          checked={value}
          onChange={() => {
            setConfigValue(section, prop, !value as UIConfig[S][typeof prop]);
            if (onChange) {
              onChange(value);
            }
          }}
          aria-label={ariaLabel || label}
        />
        { ...appendElements }
        {createHelpIcon({ ...props, className: "ms-3" })}
      </Col>
    </Row>
  );
}

export default CheckboxRow;
