import type { MaxVideoResolution, UIConfig } from "../../types/UIConfig";
import { useConfig } from "../contexts/ConfigProvider";
import TextInputRow from "./components/TextInputRow";
import { Container } from "react-bootstrap";
import { useMemo } from "react";
import _ from "lodash";
import CheckboxRow from "./components/CheckboxRow";
import SelectRow from "./components/SelectRow";
import type { UnionToObjectTuple } from "../../../common/types/Utility";

interface OtherBoxState {
  pathToFFmpeg: string;
  pathToDeno: string;
  maxVideoResolution: MaxVideoResolution;
  noPrompt: boolean;
  dryRun: boolean;
}

let oldState: OtherBoxState | null = null;

const MAX_VIDEO_RESOLUTION_OPTIONS: UnionToObjectTuple<
  MaxVideoResolution,
  { label: string }
> = [
  { value: "none", label: "None - download best quality" },
  { value: "360p", label: "360p" },
  { value: "480p", label: "480p" },
  { value: "720p", label: "720p" },
  { value: "1080p", label: "1080p" },
  { value: "1440p", label: "1440p" },
  { value: "2160p", label: "2160p" }
];

function getOtherBoxState(config: UIConfig): OtherBoxState {
  const state: OtherBoxState = {
    pathToFFmpeg: config["downloader"]["path.to.ffmpeg"],
    pathToDeno: config["downloader"]["path.to.deno"],
    maxVideoResolution: config["downloader"]["max.video.resolution"],
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
        <TextInputRow
          type="file"
          config={["downloader", "path.to.deno"]}
          label="Path to Deno"
          helpTooltip="The path to Deno executable."
          helpHasMoreInfo
        />
        <SelectRow
          config={["downloader", "max.video.resolution"]}
          label="Max video resolution"
          options={MAX_VIDEO_RESOLUTION_OPTIONS}
          helpTooltip="Maximum video resolution."
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
