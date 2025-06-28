import type {
  BrowserObtainableInput,
  BrowserObtainedValue,
  UIConfig,
  UIConfigProp,
  UIConfigSectionWithPropsOf
} from "../../../types/UIConfig";
import { useConfig } from "../../contexts/ConfigProvider";
import type { ObjectKeysByValueType } from "../../../../common/types/Utility";
import {
  Button,
  ButtonGroup,
  Col,
  Dropdown,
  FloatingLabel,
  Form,
  InputGroup,
  Row
} from "react-bootstrap";
import { useCallback, useEffect, useState } from "react";
import type { AccessibilityProps, HelpProps } from "./Common";
import { createHelpIcon } from "./Common";

type PropWithSupportData<
  S extends UIConfigSectionWithPropsOf<BrowserObtainableInput>
> = UIConfigProp<S, BrowserObtainableInput> &
  ObjectKeysByValueType<
    UIConfig["support.data"]["browserObtainedValues"],
    BrowserObtainedValue | null
  >;

type BrowserObtainableInputRowProps<
  S extends UIConfigSectionWithPropsOf<BrowserObtainableInput>
> = {
  config: [S, PropWithSupportData<S>];
  label: string;
  disableManualInput?: boolean;
  manualInputModeLabel?: string;
  onManualValueChange?: (value: string) => void;
} & HelpProps &
  AccessibilityProps;

function BrowserObtainableInputRow<
  S extends UIConfigSectionWithPropsOf<BrowserObtainableInput>
>(props: BrowserObtainableInputRowProps<S>) {
  const { config, setConfigValue } = useConfig();
  const [capturePaused, setCapturePaused] = useState(false);
  const {
    config: target,
    label,
    manualInputModeLabel = "Enter value",
    onManualValueChange,
    disableManualInput = false,
    ariaLabel
  } = props;
  const [section, prop] = target;
  const {
    inputMode: _inputMode,
    manualValue,
    browserValue
  } = config[section][prop] as BrowserObtainableInput;
  const supportData = config["support.data"]["browserObtainedValues"][prop];

  const inputMode = disableManualInput ? "browser" : _inputMode;

  useEffect(() => {
    if (capturePaused || !supportData) {
      return;
    }
    setConfigValue(section, prop, {
      ...config[section][prop],
      browserValue: { ...supportData }
    });
  }, [capturePaused, config, setConfigValue, supportData]);

  const setInputMode = (mode: BrowserObtainableInput["inputMode"]) => {
    if (mode === inputMode) {
      return;
    }
    setConfigValue(section, prop, {
      ...config[section][prop],
      inputMode: mode
    });
  };

  const updateManualValue = useCallback(
    (value: string) => {
      setConfigValue(section, prop, {
        ...config[section][prop],
        manualValue: value
      });
      if (onManualValueChange) {
        onManualValueChange(value);
      }
    },
    [setConfigValue, config, onManualValueChange]
  );

  const inputModeIcon = (
    <InputGroup.Text>
      <span className="fs-6 material-icons" style={{ lineHeight: "inherit" }}>
        {inputMode === "manual" ? "edit" : "language"}
      </span>
    </InputGroup.Text>
  );

  const inputModeDropDown =
    !disableManualInput ?
      <Dropdown as={ButtonGroup}>
        <Dropdown.Toggle size="sm" variant="secondary" />
        <Dropdown.Menu>
          <Dropdown.Item href="#" onClick={() => setInputMode("manual")}>
            <div className="d-flex align-items-center">
              <span className="fs-6 me-2 material-icons">edit</span>
              {manualInputModeLabel}
            </div>
          </Dropdown.Item>
          <Dropdown.Item href="#" onClick={() => setInputMode("browser")}>
            <div className="d-flex align-items-center">
              <span className="fs-6 me-2 material-icons">language</span>Capture
              from browser
            </div>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>
    : null;

  const capturingText = "Capturing from browser...";
  const floatingText =
    capturePaused ? `(Paused)${browserValue ? ` ${capturingText}` : ""}`
    : browserValue && browserValue.description ? capturingText
    : null;

  let valueEl =
    inputMode === "manual" ?
      <Form.Control
        type="text"
        size="sm"
        value={manualValue}
        onChange={(e) => updateManualValue(e.currentTarget.value)}
        aria-label={ariaLabel || label}
      />
    : <Form.Control
        type="text"
        size="sm"
        readOnly
        className={`bg-body text-light ${!browserValue?.value ? "fst-italic" : ""}`}
        value={browserValue?.description || capturingText}
        aria-label={ariaLabel || label}
      />;

  if (inputMode === "browser" && floatingText) {
    valueEl = (
      <FloatingLabel label={<span className="text-info">{floatingText}</span>}>
        {valueEl}
      </FloatingLabel>
    );
  }

  if (inputMode === "browser") {
    valueEl = (
      <>
        {valueEl}
        <Button
          size="sm"
          variant="link"
          className="bg-body"
          onClick={() => setCapturePaused(!capturePaused)}
          title={capturePaused ? "Resume capture" : "Pause capture"}
          aria-label={capturePaused ? "Resume capture" : "Pause capture"}
        >
          <span
            className="fs-4 text-info material-icons"
            style={{ position: "relative", top: "0.25rem" }}
          >
            {capturePaused ? "play_circle" : "pause_circle"}
          </span>
        </Button>
      </>
    );
  }

  return (
    <Row
      className={`py-1 align-items-center browser-obtainable-input ${inputMode}-input-mode`}
    >
      <Col xs={4}>{label}:</Col>
      <Col xs={8} className="d-flex align-items-center">
        <InputGroup>
          {inputModeIcon}
          {valueEl}
          {inputModeDropDown}
        </InputGroup>
        {createHelpIcon(props)}
      </Col>
    </Row>
  );
}

export default BrowserObtainableInputRow;
