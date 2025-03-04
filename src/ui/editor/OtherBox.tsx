import type { UIConfig } from "../../types/UIConfig";
import { useConfig } from "../contexts/ConfigProvider";
import TextInputRow from "./components/TextInputRow";
import { Container } from "react-bootstrap";
import { useMemo } from "react";
import _ from "lodash";
import CheckboxRow from "./components/CheckboxRow";

interface OtherBoxState {
  pathToFFmpeg: string;
  noPrompt: boolean;
  dryRun: boolean;
}

let oldState: OtherBoxState | null = null;

function getOtherBoxState(config: UIConfig): OtherBoxState {
  const state: OtherBoxState = {
    pathToFFmpeg: config["downloader"]["path.to.ffmpeg"],
    noPrompt: config.downloader["no.prompt"],
    dryRun: config.downloader["dry.run"]
  };

  if (oldState && _.isEqual(oldState, state)) {
    return oldState;
  }
  oldState = _.cloneDeep(state);
  return state;
}

function OtherBox() {
  const { config } = useConfig();
  const state = getOtherBoxState(config);

  return useMemo(() => {
    return (
      <Container fluid>
        <TextInputRow
          type="file"
          config={["downloader", "path.to.ffmpeg"]}
          label="Path to FFmpeg"
          helpTooltip="The path to FFmpeg executable."
          helpHasMoreInfo
        />
        <CheckboxRow
          config={["downloader", "no.prompt"]}
          label="No prompt"
          helpTooltip="Begin download without prompting for confirmation."
        />
        <CheckboxRow
          config={["downloader", "dry.run"]}
          label="Dry run"
          helpTooltip="Download without writing files to disk (except logs, if any)."
        />
      </Container>
    );
  }, [state]);
}

export default OtherBox;
