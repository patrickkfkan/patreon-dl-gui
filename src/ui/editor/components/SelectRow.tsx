import type {
  UIConfig,
  UIConfigProp,
  UIConfigSectionWithPropsOf
} from "../../../types/UIConfig";
import type { UnionToObjectTuple } from "../../../types/Utility";
import { useConfig } from "../../contexts/ConfigProvider";
import { Col, Form, Row } from "react-bootstrap";
import type { AccessibilityProps, HelpProps } from "./Common";
import { createHelpIcon } from "./Common";

type SelectRowProps<
  S extends UIConfigSectionWithPropsOf<string>,
  P extends UIConfigProp<S, string>
> = {
  config: [S, P];
  label: string;
  options: UnionToObjectTuple<
    UIConfig[S][P] extends string ? UIConfig[S][P] : string,
    { label: string }
  >;
} & HelpProps &
  AccessibilityProps;

function SelectRow<
  S extends UIConfigSectionWithPropsOf<string>,
  P extends UIConfigProp<S, string>
>(props: SelectRowProps<S, P>) {
  const { config, setConfigValue } = useConfig();
  const { config: pConfig, label, options, ariaLabel } = props;
  const [section, prop] = pConfig;
  const value = config[section][prop] as string;

  return (
    <Row className="align-items-center py-1">
      <Col xs={4}>{label}:</Col>
      <Col>
        <div className="d-flex align-items-center">
          <Form.Select
            size="sm"
            value={value}
            onChange={(e) =>
              setConfigValue(
                section,
                prop,
                e.currentTarget.value as UIConfig[S][P]
              )
            }
            aria-label={ariaLabel || label}
          >
            {options.map(({ value, label }) => (
              <option
                key={`${section}-${String(prop)}-${value}`}
                value={value as string}
              >
                {label}
              </option>
            ))}
          </Form.Select>
          {createHelpIcon(props)}
        </div>
      </Col>
    </Row>
  );
}

export default SelectRow;
