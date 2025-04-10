import type { UIConfig } from "../../types/UIConfig";
import { useConfig } from "../contexts/ConfigProvider";
import SelectRow from "./components/SelectRow";
import TextInputRow from "./components/TextInputRow";
import { Button, Container, Tab, Tabs } from "react-bootstrap";
import type { CSSProperties } from "react";
import { useMemo } from "react";
import _ from "lodash";
import CheckboxRow from "./components/CheckboxRow";
import { useCommands } from "../contexts/CommandsProvider";
import { useEditor } from "../contexts/EditorContextProvider";

interface EmbedsBoxState {
  embedDownloaderYouTube: UIConfig["embed.downloader.youtube"];
  embedDownloaderVimeo: UIConfig["embed.downloader.vimeo"];
  connectYouTube: UIConfig["patreon.dl.gui"]["connect.youtube"];
}

let oldState: EmbedsBoxState | null = null;

function getEmbedsBoxState(config: UIConfig): EmbedsBoxState {
  const state: EmbedsBoxState = {
    embedDownloaderYouTube: config["embed.downloader.youtube"],
    embedDownloaderVimeo: config["embed.downloader.vimeo"],
    connectYouTube: config["patreon.dl.gui"]["connect.youtube"]
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
  const { youtubeConnectionStatus } = useEditor();
  const { configureYouTube } = useCommands();
  const state = getEmbedsBoxState(config);

  const ytConnectionStatusEl = useMemo(() => {
    if (!youtubeConnectionStatus) {
      return null;
    }

    let label: string;
    let icon: { className: string; style?: CSSProperties; symbol: string };
    if (youtubeConnectionStatus.isConnected) {
      label = "Connected";
      icon = { className: "text-success", symbol: "check_circle" };
    } else {
      label = "Not connected";
      icon = {
        className: "text-danger",
        style: { position: "relative", top: "0.05rem" },
        symbol: "cancel"
      };
    }

    return (
      <div
        className="ms-2 ps-1 d-flex align-items-center bg-secondary"
        style={{ borderRadius: "var(--bs-border-radius)" }}
      >
        <span
          className={`material-symbols-outlined me-2 ${icon.className}`}
          style={{ fontSize: "large", ...icon.style }}
        >
          {icon.symbol}
        </span>
        <span
          style={{ fontSize: "smaller", position: "relative", top: "0.05rem" }}
        >
          {label}
        </span>
        <Button
          size="sm"
          className="ms-2"
          style={{ borderTopLeftRadius: "0", borderBottomLeftRadius: "0" }}
          onClick={configureYouTube}
          title="Open YouTube Configurator"
          aria-label="Open YouTube Configurator"
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: "large", lineHeight: "inherit" }}
          >
            settings
          </span>
        </Button>
      </div>
    );
  }, [youtubeConnectionStatus]);

  return useMemo(() => {
    const { embedDownloaderYouTube, embedDownloaderVimeo } = state;
    return (
      <Tabs
        defaultActiveKey="embed-downloader-youtube"
        variant="underline"
        className="mb-2 py-1 px-3"
      >
        <Tab
          className="pb-2"
          eventKey="embed-downloader-youtube"
          title="YouTube"
        >
          <Container fluid>
            <SelectRow
              config={["embed.downloader.youtube", "type"]}
              label="Download method"
              options={[
                { value: "default", label: "Use built-in downloader" },
                { value: "custom", label: "Run external command" }
              ]}
            />
            {embedDownloaderYouTube.type === "default" ?
              <CheckboxRow
                config={["patreon.dl.gui", "connect.youtube"]}
                label="Connect to YouTube account"
                helpTooltip="If you have a YouTube Premium account, connecting to it allows you to download videos at higher qualities where available."
                helpHasMoreInfo
                appendElements={
                  ytConnectionStatusEl ? [ytConnectionStatusEl] : undefined
                }
              />
            : null}
            {embedDownloaderYouTube.type === "custom" ?
              <TextInputRow
                config={["embed.downloader.youtube", "exec"]}
                label="External command"
                insertables={EXEC_INSERTABLES}
                helpTooltip="Command to download embedded YouTube videos."
                helpHasMoreInfo
              />
            : null}
          </Container>
        </Tab>
        <Tab className="pb-2" eventKey="embed-downloader-vimeo" title="Vimeo">
          <Container fluid>
            <SelectRow
              config={["embed.downloader.vimeo", "type"]}
              label="Download method"
              options={[
                {
                  value: "helper",
                  label: "Use helper script (requires yt-dlp)"
                },
                { value: "custom", label: "Run external command" }
              ]}
              helpTooltip="Method to download embedded Vimeo videos."
              helpHasMoreInfo
            />
            {embedDownloaderVimeo.type === "helper" ?
              <>
                <TextInputRow
                  type="file"
                  config={["embed.downloader.vimeo", "helper.ytdlp.path"]}
                  label="Path to yt-dlp"
                  helpTooltip="Path to yt-dlp executable."
                  helpHasMoreInfo
                />
                <TextInputRow
                  config={["embed.downloader.vimeo", "helper.password"]}
                  label="Private video password"
                  helpTooltip="Password for protected Vimeo videos"
                />
              </>
            : null}
            {embedDownloaderVimeo.type === "custom" ?
              <TextInputRow
                config={["embed.downloader.vimeo", "exec"]}
                label="External command"
                insertables={EXEC_INSERTABLES}
                helpTooltip="Command to download embedded Vimeo videos."
                helpHasMoreInfo
              />
            : null}
          </Container>
        </Tab>
      </Tabs>
    );
  }, [state, ytConnectionStatusEl]);
}

export default EmbedsBox;
