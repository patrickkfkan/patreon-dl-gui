import type { UIConfig } from "../../types/UIConfig";
import { useConfig } from "../contexts/ConfigProvider";
import SelectRow from "./components/SelectRow";
import TextInputRow from "./components/TextInputRow";
import { Container } from "react-bootstrap";
import { useMemo } from "react";
import _ from "lodash";

interface EmbedsBoxState {
  embedDownloaderYouTube: UIConfig["embed.downloader.youtube"];
  embedDownloaderVimeo: UIConfig["embed.downloader.vimeo"];
}

let oldState: EmbedsBoxState | null = null;

function getEmbedsBoxState(config: UIConfig): EmbedsBoxState {
  const state: EmbedsBoxState = {
    embedDownloaderYouTube: config["embed.downloader.youtube"],
    embedDownloaderVimeo: config["embed.downloader.vimeo"]
  };
  if (oldState && _.isEqual(oldState, state)) {
    return oldState;
  }
  oldState = _.cloneDeep(state);
  return state;
}

const EXEC_INSERTABLES = [
  { value: "{post.id}", label: "post id" },
  { value: "{post.url}", label: "post url" },
  { value: "{embed.provider}", label: "provider" },
  { value: "{embed.provider.url}", label: "provider url" },
  { value: "{embed.url}", label: "content url" },
  { value: "{embed.subject}", label: "subject" },
  { value: "{embed.html}", label: "embed html" },
  { value: "{cookie}", label: "cookie" },
  { value: "{dest.dir}", label: "destination directory" }
];

function EmbedsBox() {
  const { config } = useConfig();
  const state = getEmbedsBoxState(config);

  return useMemo(() => {
    const { embedDownloaderYouTube } = state;
    return (
      <Container fluid className="pt-3">
        <SelectRow
          config={["embed.downloader.youtube", "type"]}
          label="YouTube"
          options={[
            { value: "default", label: "Use built-in downloader" },
            { value: "custom", label: "Use external downloader" }
          ]}
        />
        {embedDownloaderYouTube.type === "custom" ?
          <TextInputRow
            config={["embed.downloader.youtube", "exec"]}
            label="YouTube download command"
            insertables={EXEC_INSERTABLES}
            helpTooltip="Command to download embedded YouTube videos."
            helpHasMoreInfo
          />
        : null}
        <TextInputRow
          config={["embed.downloader.vimeo", "exec"]}
          label="Vimeo download command"
          insertables={EXEC_INSERTABLES}
          helpTooltip="Command to download embedded Vimeo videos."
          helpHasMoreInfo
        />
      </Container>
    );
  }, [state]);
}

export default EmbedsBox;
