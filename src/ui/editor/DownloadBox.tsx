import type { UIConfig } from "../../types/UIConfig";
import CheckboxRow from "./components/CheckboxRow";
import TextInputRow from "./components/TextInputRow";
import BrowserObtainableInputRow from "./components/BrowserObtainableInputRow";
import { useConfig } from "../contexts/ConfigProvider";
import { Container, Card } from "react-bootstrap";
import { useMemo } from "react";
import _ from "lodash";
import type { StopOnCondition } from "patreon-dl";
import SelectRow from "./components/SelectRow";

interface DownloadBoxState {
  target: UIConfig["downloader"]["target"];
  outDir: string;
  cookie: UIConfig["downloader"]["cookie"];
  useStatusCache: boolean;
  stopOn: StopOnCondition;
}

let oldState: DownloadBoxState | null = null;

function getDownloadBoxState(config: UIConfig): DownloadBoxState {
  const state = {
    target: config.downloader.target,
    outDir: config.output["out.dir"],
    cookie: config.downloader.cookie,
    useStatusCache: config.downloader["use.status.cache"],
    stopOn: config.downloader["stop.on"]
  };
  if (oldState && _.isEqual(oldState, state)) {
    return oldState;
  }
  oldState = _.cloneDeep(state);
  return state;
}

function DownloadBox() {
  const { config } = useConfig();
  const state = getDownloadBoxState(config);

  return useMemo(() => {
    return (
      <Card className="mt-3 bg-transparent border border-secondary">
        <Card.Header>Download</Card.Header>
        <Card.Body className="p-1">
          <Container fluid>
            <BrowserObtainableInputRow
              config={["downloader", "target"]}
              label="Target"
              disableManualInput
              helpTooltip="The target to download."
              helpHasMoreInfo
            />
            <TextInputRow
              type="dir"
              config={["output", "out.dir"]}
              label="Destination"
              helpTooltip="Path to directory where content is saved."
            />
            <BrowserObtainableInputRow
              config={["downloader", "cookie"]}
              label="Cookie"
              helpTooltip="The cookie to use in download requests."
              helpHasMoreInfo
            />
            <CheckboxRow
              config={["downloader", "use.status.cache"]}
              label="Use status cache"
              helpTooltip="Use status cache to quickly skip previously downloaded items."
              helpHasMoreInfo
            />
            <SelectRow
              config={["downloader", "stop.on"]}
              label="Stop condition"
              options={[
                { label: "None (run till the end)", value: "never" },
                {
                  label: "Previously downloaded post encountered",
                  value: "postPreviouslyDownloaded"
                },
                {
                  label: "Publish date of post out of specified range",
                  value: "postPublishDateOutOfRange"
                }
              ]}
              helpTooltip="When to stop the downloader."
              helpHasMoreInfo
            />
          </Container>
        </Card.Body>
      </Card>
    );
  }, [state]);
}

export default DownloadBox;
