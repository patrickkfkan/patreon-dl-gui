import { useCallback, useRef } from "react";
import { Button, Col, Form, InputGroup, Row, Stack } from "react-bootstrap";
import classNames from "classnames";
import type { AccessibilityProps, HelpProps } from "../../../common/ui";
import HelpIcon from "./HelpIcon";

type InputValueType = "text" | "number" | "dir" | "file";

type TextInputRowProps<
  T extends InputValueType
> = {
  type?: T;
  value: T extends 'number' ? number : string;
  label: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
} & Pick<HelpProps, "helpTooltip"> &
  AccessibilityProps;

const nativeSetter = Object.getOwnPropertyDescriptor(
  window.HTMLInputElement.prototype,
  'value'
)?.set;

function TextInputRow<
  T extends InputValueType
>(props: TextInputRowProps<T>) {
  const {
    type = "text",
    value,
    label,
    ariaLabel,
    onChange,
    error,
    helpTooltip
  } = props;
  const textboxRef = useRef<HTMLInputElement | null>(null);

  const textbox = (
    <Form.Control
      ref={textboxRef}
      type={type === "number" ? "number" : "text"}
      className={classNames({
        "border-danger": !!error
      })}
      size="sm"
      value={value}
      onChange={onChange}
      aria-label={ariaLabel || label}
    />
  );

  const openFSChooser = useCallback(
    async (type: "dir" | "file") => {
      const result = await window.serverConsoleAPI.invoke("openFSChooser", {
        properties: type === "dir" ? ["openDirectory"] : ["openFile"],
        title: type === "dir" ? "Choose directory" : "Choose file"
      });
      if (result.canceled) {
        return;
      }
      if (textboxRef.current) {
        nativeSetter?.call(textboxRef.current, result.filePath);
        textboxRef.current.dispatchEvent(new Event('change', { bubbles: true }));
      }
    },
    []
  );

  let textboxContainer;
  switch (type) {
    case "text":
    case "number":
      textboxContainer = textbox;
      break;
    case "dir":
    case "file":
      textboxContainer = (
        <InputGroup>
          {textbox}
          <Button
            size="sm"
            variant={error ? "danger" : undefined}
            onClick={() => openFSChooser(type)}
            aria-label="Choose directory"
          >
            <span
              className="fs-6 material-icons"
              style={{ lineHeight: "inherit" }}
            >
              folder
            </span>
          </Button>
        </InputGroup>
      );
      break;
  }

  const classes = classNames(
    "m-0",
    "py-1",
    "align-items-center"
  );

  return (
    <div>
      <Row className={classes}>
        <Col className="p-0" xs={4}>{label}:</Col>
        <Col className="p-0" xs={8}>
          <div className="d-flex align-items-center">
            {textboxContainer}
            {helpTooltip ? (
              <HelpIcon tooltip={helpTooltip} className="ms-2" />
            ) : null}
          </div>
        </Col>
      </Row>
      { error ? (
        <Row className="m-0">
        <Col className="p-0" xs={4}></Col>
        <Col className="p-0" xs={8}>
          <span className="text-danger">{error}</span>
        </Col>
      </Row>
      ): null}
    </div>
  );
}

export default TextInputRow;
