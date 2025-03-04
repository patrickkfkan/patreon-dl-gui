import type {
  UIConfig,
  UIConfigSectionPropTuple,
  UIConfigSectionWithPropsOf
} from "../../../types/UIConfig";
import { useConfig } from "../../contexts/ConfigProvider";
import { Col, Form, Row } from "react-bootstrap";
import type { AccessibilityProps, HelpProps } from "./Common";
import { createHelpIcon } from "./Common";

type CheckboxRowProps<S extends UIConfigSectionWithPropsOf<boolean>> = {
  config: UIConfigSectionPropTuple<S, boolean>;
  label: string;
} & HelpProps &
  AccessibilityProps;

function CheckboxRow<S extends UIConfigSectionWithPropsOf<boolean>>(
  props: CheckboxRowProps<S>
) {
  const { config, setConfigValue } = useConfig();
  const { config: pConfig, label, ariaLabel } = props;
  const [section, prop] = pConfig;
  const value = config[section][prop] as boolean;

  return (
    <Row className="align-items-center py-1">
      <Col xs={4}>{label}:</Col>
      <Col className="d-flex align-items-center">
        <Form.Check
          checked={value}
          onChange={() =>
            setConfigValue(section, prop, !value as UIConfig[S][typeof prop])
          }
          aria-label={ariaLabel || label}
        />
        {createHelpIcon({ ...props, className: "ms-3" })}
      </Col>
    </Row>
  );
}

export default CheckboxRow;
