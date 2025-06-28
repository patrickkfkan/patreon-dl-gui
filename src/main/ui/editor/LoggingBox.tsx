import type { UIConfig } from "../../types/UIConfig";
import type { UnionToObjectTuple } from "../../../common/types/Utility";
import { useConfig } from "../contexts/ConfigProvider";
import SelectRow from "./components/SelectRow";
import CheckboxRow from "./components/CheckboxRow";
import TextInputRow from "./components/TextInputRow";
import { Container, Tab, Tabs } from "react-bootstrap";
import { useCallback, useMemo } from "react";
import type { LogLevel } from "patreon-dl";
import _ from "lodash";

interface LoggingBoxState {
  consoleLogger: UIConfig["logger.console"];
  fileLogger: UIConfig["logger.file.1"];
}

let oldState: LoggingBoxState | null = null;

function getLoggingBoxState(config: UIConfig): LoggingBoxState {
  const state: LoggingBoxState = {
    consoleLogger: config["logger.console"],
    fileLogger: config["logger.file.1"]
  };

  if (oldState && _.isEqual(oldState, state)) {
    return oldState;
  }
  oldState = _.cloneDeep(state);
  return state;
}

const LOG_LEVEL_OPTIONS: UnionToObjectTuple<LogLevel, { label: string }> = [
  { value: "debug", label: "Debug" },
  { value: "info", label: "Info" },
  { value: "warn", label: "Warn" },
  { value: "error", label: "Error" }
];

function LoggingBox() {
  const { config } = useConfig();
  const state = getLoggingBoxState(config);

  const getCommonElements = useCallback(
    (forType: "logger.console" | "logger.file.1") => {
      return (
        <>
          <CheckboxRow
            config={[forType, "include.date.time"]}
            label="Include date-time"
            helpTooltip="Include the date and time of a message."
          />
          <CheckboxRow
            config={[forType, "include.level"]}
            label="Include level"
            helpTooltip="Include the log level of a message."
          />
          <CheckboxRow
            config={[forType, "include.originator"]}
            label="Include originator"
            helpTooltip="Include the originator of a message."
          />
          <CheckboxRow
            config={[forType, "include.error.stack"]}
            label="Include error stack"
            helpTooltip="Include the full error stack for error messages."
          />
          <TextInputRow
            config={[forType, "date.time.format"]}
            label="Datetime format"
            helpTooltip="The string pattern to format date and time."
            helpHasMoreInfo
          />
          <CheckboxRow
            config={[forType, "color"]}
            label="Colorize"
            helpTooltip="Colorize messages."
          />
        </>
      );
    },
    []
  );

  return useMemo(() => {
    return (
      <Tabs
        defaultActiveKey="logging-console-logger"
        variant="underline"
        className="mb-2 py-1 px-3"
      >
        <Tab
          className="pb-2"
          eventKey="logging-console-logger"
          title="Console logger"
        >
          <Container fluid>
            <CheckboxRow
              config={["logger.console", "enabled"]}
              label="Enabled"
              helpTooltip="Enable the console logger."
              ariaLabel="Enable console logger"
            />
            <SelectRow
              config={["logger.console", "log.level"]}
              label="Log level"
              options={LOG_LEVEL_OPTIONS}
              helpTooltip="Logging level."
              helpHasMoreInfo
            />
            {getCommonElements("logger.console")}
          </Container>
        </Tab>

        <Tab
          className="pb-2"
          eventKey="logging-file-logger"
          title="File logger"
        >
          <Container fluid>
            <CheckboxRow
              config={["logger.file.1", "enabled"]}
              label="Enabled"
              helpTooltip="Enable file logging."
              ariaLabel="Enable file logging"
            />
            <SelectRow
              config={["logger.file.1", "log.level"]}
              label="Log level"
              options={LOG_LEVEL_OPTIONS}
              helpTooltip="Logging level."
              helpHasMoreInfo
            />
            <TextInputRow
              type="dir"
              config={["logger.file.1", "log.dir"]}
              label="Directory"
              insertables={[
                { value: "{out.dir}", label: "out dir" },
                { value: "{target.url.path}", label: "target url pathname" },
                { value: "{datetime.yyyymmdd}", label: "log date" }
              ]}
              helpTooltip="The destination directory of the log file. Can be a fixed path or string pattern."
              helpHasMoreInfo
            />
            <TextInputRow
              config={["logger.file.1", "log.filename"]}
              label="Filename"
              insertables={[
                { value: "{target.url.path}", label: "target url pathname" },
                { value: "{log.level}", label: "log level" },
                { value: "{datetime.yyyymmdd}", label: "log date" }
              ]}
              helpTooltip="The filename of the log file. Can be a fixed name or string pattern."
              helpHasMoreInfo
            />
            <SelectRow
              config={["logger.file.1", "file.exists.action"]}
              label="If file exists"
              options={[
                { value: "append", label: "Append" },
                { value: "overwrite", label: "Overwrite" }
              ]}
              helpTooltip="The action to take if log file already exists."
            />
            {getCommonElements("logger.file.1")}
          </Container>
        </Tab>
      </Tabs>
    );
  }, [state]);
}

export default LoggingBox;
