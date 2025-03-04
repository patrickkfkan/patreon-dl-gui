import type {
  UIConfig,
  UIConfigSectionPropTuple,
  UIConfigSectionWithPropsOf
} from "../../../types/UIConfig";
import { useConfig } from "../../contexts/ConfigProvider";
import type React from "react";
import { useCallback, useRef } from "react";
import { Button, Col, Form, InputGroup, Row } from "react-bootstrap";
import classNames from "classnames";
import type { AccessibilityProps, HelpProps } from "./Common";
import { createHelpIcon } from "./Common";

type InputValueType = "text" | "number" | "dir" | "file";
type ConfigValueType<T extends InputValueType> = T extends "number"
  ? number
  : string;

type TextInputRowProps<
  S extends UIConfigSectionWithPropsOf<ConfigValueType<T>>,
  T extends InputValueType
> = {
  as?: "inputGroup" | "row";
  type?: T;
  config: UIConfigSectionPropTuple<S, ConfigValueType<T>>;
  label: string;
  insertables?: { value: string; label: string }[];
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
} & HelpProps &
  AccessibilityProps;

function TextInputRow<
  S extends UIConfigSectionWithPropsOf<ConfigValueType<T>>,
  T extends InputValueType
>(props: TextInputRowProps<S, T>) {
  const { config, setConfigValue } = useConfig();
  const {
    as = "row",
    type = "text",
    config: target,
    label,
    insertables,
    ariaLabel,
    onChange
  } = props;
  const [section, prop] = target;
  const value = config[section][prop] as string | number;
  const textboxRef = useRef<HTMLInputElement | null>(null);

  const _setConfigValue = useCallback(
    (inputValue: string) => {
      const configValue = type === "number" ? Number(inputValue) : inputValue;
      setConfigValue(
        section,
        prop,
        configValue as UIConfig[typeof section][typeof prop]
      );
    },
    [setConfigValue]
  );

  const handleValueChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      _setConfigValue(e.currentTarget.value);
      if (onChange) {
        onChange(e);
      }
    },
    [_setConfigValue, onChange]
  );

  const textbox = (
    <Form.Control
      ref={textboxRef}
      type={type === "number" ? "number" : "text"}
      size="sm"
      value={value}
      onChange={handleValueChange}
      aria-label={ariaLabel || label}
    />
  );

  const openFSChooser = useCallback(
    (type: "dir" | "file") => {
      window.electronAPI.on(
        "fsChooserResult",
        (result) => {
          if (result.canceled) {
            return;
          }
          _setConfigValue(result.filePath);
        },
        { once: true }
      );
      window.electronAPI.emitMainEvent("openFSChooser", {
        properties: type === "dir" ? ["openDirectory"] : ["openFile"],
        title: type === "dir" ? "Choose directory" : "Choose file"
      });
    },
    [_setConfigValue]
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

  const insertField = (value: string) => {
    const textbox = textboxRef.current;
    if (!textbox) {
      return;
    }
    const currentStart = textbox.selectionStart || 0;
    textbox.setRangeText(value);
    textbox.selectionEnd = textbox.selectionStart = currentStart + value.length;
    textbox.focus();
  };

  const insertableLinks = insertables?.map(({ value, label }) => (
    <a
      key={`${section}-${String(prop)}-${value}`}
      href="#"
      className="insertable p-0 link-info mx-1 text-nowrap"
      onClick={() => insertField(value)}
      aria-label={`Insert ${label}`}
    >
      {label}
    </a>
  ));

  let insertablesContainer = <></>;
  if (insertableLinks && insertableLinks.length > 0) {
    insertablesContainer = (
      <div className="d-flex pb-2 insertable">
        <div className="pe-2">Insert:</div>
        <div className="d-flex flex-wrap">{insertableLinks}</div>
      </div>
    );
  }

  const classes = classNames(
    "py-1",
    insertableLinks && insertableLinks.length > 0 ? null : "align-items-center"
  );

  if (as === "inputGroup") {
    return (
      <>
        <div className="d-flex align-items-center flex-grow-1">
          <InputGroup size="sm" className="mb-2">
            <InputGroup.Text>{label}</InputGroup.Text>
            {textboxContainer}
            {createHelpIcon({ ...props, className: "ms-2 pt-1" })}
          </InputGroup>
        </div>
        {insertablesContainer}
      </>
    );
  }

  return (
    <>
      <Row className={classes}>
        <Col xs={4}>{label}:</Col>
        <Col xs={8}>
          <div className="d-flex align-items-center">
            {textboxContainer}
            {createHelpIcon(props)}
          </div>
          {insertablesContainer}
        </Col>
      </Row>
    </>
  );
}

export default TextInputRow;
