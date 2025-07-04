import { Col, Form, Row } from "react-bootstrap";
import type { AccessibilityProps, HelpProps } from "../../../common/ui";
import HelpIcon from "./HelpIcon";

type SelectRowProps = {
  label: string;
  value: string;
  options: { label: string; value: string; }[];
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
} & Pick<HelpProps, "helpTooltip"> &
  AccessibilityProps;

function SelectRow(props: SelectRowProps) {
  const { label, value, options, onChange, ariaLabel, helpTooltip } = props;

  return (
    <Row className="align-items-center py-1 m-0">
      <Col className="p-0" xs={4}>{label}:</Col>
      <Col className="p-0">
        <div className="d-flex align-items-center">
          <Form.Select
            size="sm"
            value={value}
            onChange={onChange}
            aria-label={ariaLabel || label}
          >
            {options.map(({ value, label }) => (
              <option
                key={`option-${label}-${value}`}
                value={value}
              >
                {label}
              </option>
            ))}
          </Form.Select>
          {helpTooltip ? (
            <HelpIcon tooltip={helpTooltip} className="ms-2" />
          ) : null}
        </div>
      </Col>
    </Row>
  );
}

export default SelectRow;
