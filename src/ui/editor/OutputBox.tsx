import type { UIConfig } from "../../types/UIConfig";
import type { UnionToObjectTuple } from "../../types/Utility";
import { useConfig } from "../contexts/ConfigProvider";
import SelectRow from "./components/SelectRow";
import TextInputRow from "./components/TextInputRow";
import { Container, Tab, Tabs } from "react-bootstrap";
import { useMemo } from "react";
import type { FileExistsAction } from "patreon-dl";
import _ from "lodash";

interface OutputBoxState {
  campaignDirNameFormat: string;
  contentDirNameFormat: string;
  mediaFilenameFormat: string;
  contentFileExistsAction: FileExistsAction;
  infoFileExistsAction: FileExistsAction;
  infoAPIFileExistsAction: FileExistsAction;
}

let oldState: OutputBoxState | null = null;

function getOutputBoxState(config: UIConfig): OutputBoxState {
  const state: OutputBoxState = {
    campaignDirNameFormat: config.output["campaign.dir.name.format"],
    contentDirNameFormat: config.output["content.dir.name.format"],
    mediaFilenameFormat: config.output["media.filename.format"],
    contentFileExistsAction: config.output["content.file.exists.action"],
    infoFileExistsAction: config.output["info.file.exists.action"],
    infoAPIFileExistsAction: config.output["info.api.file.exists.action"]
  };

  if (oldState && _.isEqual(oldState, state)) {
    return oldState;
  }
  oldState = _.cloneDeep(state);
  return state;
}

const FILE_EXISTS_ACTION_OPTIONS: UnionToObjectTuple<
  FileExistsAction,
  { label: string }
> = [
  { value: "skip", label: "Skip" },
  { value: "overwrite", label: "Overwrite" },
  { value: "saveAsCopy", label: "Save as copy" },
  { value: "saveAsCopyIfNewer", label: "Save as copy if newer" }
];

function OutputBox() {
  const { config } = useConfig();
  const state = getOutputBoxState(config);

  return useMemo(() => {
    return (
      <Tabs
        defaultActiveKey="output-file-naming"
        variant="underline"
        className="mb-2 py-1 px-3"
      >
        <Tab className="pb-2" eventKey="output-file-naming" title="File naming">
          <Container fluid>
            <TextInputRow
              config={["output", "campaign.dir.name.format"]}
              label="Campaign directory"
              insertables={[
                { value: "{creator.vanity}", label: "creator vanity" },
                { value: "{creator.name}", label: "creator name" },
                { value: "{creator.id}", label: "creator id" },
                { value: "{campaign.name}", label: "campaign name" },
                { value: "{campaign.id}", label: "campaign id" }
              ]}
              helpTooltip="Campaign directory name format."
              helpHasMoreInfo
              ariaLabel="Campaign directory name format"
            />
            <TextInputRow
              config={["output", "content.dir.name.format"]}
              label="Content directory"
              insertables={[
                { value: "{content.id}", label: "content id" },
                { value: "{content.slug}", label: "slug" },
                { value: "{content.name}", label: "name" },
                { value: "{content.type}", label: "type" },
                { value: "{content.publishDate}", label: "publish date" }
              ]}
              helpTooltip="Content directory name format."
              helpHasMoreInfo
              ariaLabel="Content directory name format"
            />
            <TextInputRow
              config={["output", "media.filename.format"]}
              label="Media file"
              insertables={[
                { value: "{media.id}", label: "media id" },
                { value: "{media.filename}", label: "default filename" },
                { value: "{media.type}", label: "type" },
                { value: "{media.variant}", label: "variant" }
              ]}
              helpTooltip="Media filename format."
              helpHasMoreInfo
              ariaLabel="Media filename format"
            />
          </Container>
        </Tab>

        <Tab
          className="pb-2"
          eventKey="output-file-exists-action"
          title="File exists action"
        >
          <Container fluid>
            <SelectRow
              config={["output", "content.file.exists.action"]}
              label="Content file exists"
              options={FILE_EXISTS_ACTION_OPTIONS}
              helpTooltip="The action to take if file already exists."
              ariaLabel="Content file exists action"
            />
            <SelectRow
              config={["output", "info.file.exists.action"]}
              label="Info file exists"
              options={FILE_EXISTS_ACTION_OPTIONS}
              helpTooltip="The action to take if file already exists."
              ariaLabel="Information file exists action"
            />
            <SelectRow
              config={["output", "info.api.file.exists.action"]}
              label="Info API file exists"
              options={FILE_EXISTS_ACTION_OPTIONS}
              helpTooltip="The action to take if file already exists."
              ariaLabel="API file exists action"
            />
          </Container>
        </Tab>
      </Tabs>
    );
  }, [state]);
}

export default OutputBox;
