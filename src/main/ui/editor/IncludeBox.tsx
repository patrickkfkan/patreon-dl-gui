import type { Tier, UIConfig } from "../../types/UIConfig";
import type { UnionToObjectTuple } from "../../../common/types/Utility";
import { useConfig } from "../contexts/ConfigProvider";
import CheckboxRow from "./components/CheckboxRow";
import {
  Tab,
  Tabs,
  Container,
  Row,
  Col,
  Form,
  ListGroup,
  InputGroup
} from "react-bootstrap";
import _ from "lodash";
import type { JSX } from "react";
import { useCallback, useMemo } from "react";
import type { AccessibilityProps, HelpProps } from "../../../common/ui";
import { createHelpIcon } from "./components/Common";
import TextInputRow from "./components/TextInputRow";
import HelpIcon from "./components/HelpIcon";

interface IncludeBoxState {
  lockedContent: boolean;
  campaignInfo: boolean;
  contentInfo: boolean;
  contentMedia: UIConfig["include"]["content.media"];
  previewMedia: UIConfig["include"]["preview.media"];
  allMediaVariants: boolean;
  imagesByFilename: string;
  audioByFilename: string;
  attachmentsByFilename: string;
  postsInTier: UIConfig["include"]["posts.in.tier"];
  postsWithMediaType: UIConfig["include"]["posts.with.media.type"];
  postsPublished: UIConfig["include"]["posts.published"];
  productsPublished: UIConfig["include"]["products.published"];
  comments: boolean;
  tiers: Tier[] | null;
}

type PropWithCustomType =
  | "content.media"
  | "preview.media"
  | "posts.in.tier"
  | "posts.with.media.type";
type CustomValuesOf<P extends PropWithCustomType> =
  UIConfig["include"][P]["custom"];
const SELECT_ELEMENT_VALUE_TO_TYPE = {
  "content.media": {
    all: true,
    custom: "custom",
    none: false
  },
  "preview.media": {
    all: true,
    custom: "custom",
    none: false
  },
  "posts.in.tier": {
    any: "any",
    custom: "custom"
  },
  "posts.with.media.type": {
    any: "any",
    custom: "custom",
    none: "none"
  }
} as const;
type SelectElementValueOf<P extends PropWithCustomType> =
  keyof (typeof SELECT_ELEMENT_VALUE_TO_TYPE)[P];

let oldState: IncludeBoxState | null = null;

function getIncludeBoxState(config: UIConfig): IncludeBoxState {
  const state: IncludeBoxState = {
    lockedContent: config.include["locked.content"],
    campaignInfo: config.include["campaign.info"],
    contentInfo: config.include["content.info"],
    contentMedia: config.include["content.media"],
    previewMedia: config.include["preview.media"],
    allMediaVariants: config.include["all.media.variants"],
    imagesByFilename: config.include["images.by.filename"],
    audioByFilename: config.include["audio.by.filename"],
    attachmentsByFilename: config.include["attachments.by.filename"],
    postsInTier: config.include["posts.in.tier"],
    postsWithMediaType: config.include["posts.with.media.type"],
    postsPublished: config.include["posts.published"],
    productsPublished: config.include["products.published"],
    comments: config.include["comments"],
    tiers: config["support.data"].browserObtainedValues.tiers
  };

  if (oldState && _.isEqual(oldState, state)) {
    return oldState;
  }
  oldState = _.cloneDeep(state);
  return state;
}

type CreateCustomSelectRowArgs<P extends PropWithCustomType> = {
  prop: P;
  label: string;
  selectOptions: UnionToObjectTuple<
    SelectElementValueOf<P>,
    { label: string; default?: boolean }
  >;
  customValues: UnionToObjectTuple<
    CustomValuesOf<P>[number],
    { label: string }
  >;
  alert?: JSX.Element;
} & HelpProps &
  AccessibilityProps;

function IncludeBox() {
  const { config, setConfigValue } = useConfig();
  const state = getIncludeBoxState(config);

  const createCustomSelectRow = useCallback(
    <P extends PropWithCustomType>(args: CreateCustomSelectRowArgs<P>) => {
      const {
        prop,
        label,
        selectOptions,
        customValues,
        alert,
        helpTooltip,
        helpHasMoreInfo,
        ariaLabel
      } = args;

      // Find the value to set for the Select element
      const __getSelectElementValue = () => {
        const type = config.include[prop].type;
        const values = SELECT_ELEMENT_VALUE_TO_TYPE[prop];
        for (const [key, value] of Object.entries(values)) {
          if (value === type) {
            return key;
          }
        }
        console.warn(
          `Could not obtain element value for ${prop} type "${type}"`
        );
        return (
          selectOptions.find((opt) => opt.default)?.value ||
          selectOptions[0].value
        );
      };

      // Update config value when value of Select element changes
      const __onTypeSelectionChange = (
        selectedValue: SelectElementValueOf<P>
      ) => {
        const type = SELECT_ELEMENT_VALUE_TO_TYPE[prop][selectedValue];
        if (type !== undefined) {
          setConfigValue("include", prop, {
            ...config.include[prop],
            type
          });
        } else {
          console.warn(
            `Element value "${String(selectedValue)}" is invalid for ${prop} type`
          );
        }
      };

      // Update config when selection of custom values changes
      const __onCustomValueSelectionChange = (
        value: CustomValuesOf<P>[number]
      ) => {
        const current = config.include[prop].custom;
        let values;
        if ((current as string[]).includes(value)) {
          values = current.filter((v) => v !== value);
        } else {
          values = [...current, value];
        }
        setConfigValue("include", prop, {
          ...config.include[prop],
          custom: values
        });
      };

      // Create Select element
      const options = selectOptions.map(({ value, label }) => (
        <option key={`${prop}-option-${value}`} value={value}>
          {label}
        </option>
      ));
      const selectEl = (
        <div className="d-flex align-items-center">
          <Form.Select
            size="sm"
            value={__getSelectElementValue()}
            onChange={(e) =>
              __onTypeSelectionChange(
                e.currentTarget.value as SelectElementValueOf<P>
              )
            }
            aria-label={ariaLabel || label}
          >
            {options}
          </Form.Select>
          {helpTooltip ?
            createHelpIcon({
              helpTooltip,
              helpHasMoreInfo,
              config: ["include", prop]
            })
          : null}
        </div>
      );

      // Create custom value checkboxes
      const hidden = config.include[prop].type !== "custom";
      const currentCustomValueSelection = config.include[prop].custom;
      const customValueCheckboxes = customValues.map(({ value, label }) => (
        <ListGroup.Item
          key={`${prop}-custom-${value}`}
          className="bg-transparent py-1 px-2 border-0"
        >
          <Form.Check
            id={`${prop}-custom-${value}`}
            checked={(currentCustomValueSelection as string[]).includes(value)}
            onChange={() => __onCustomValueSelectionChange(value)}
            label={label}
          />
        </ListGroup.Item>
      ));
      const customValueEl = (
        <ListGroup className="py-2" hidden={hidden}>
          {customValueCheckboxes}
          {alert}
        </ListGroup>
      );

      return (
        <Row className="py-1">
          <Col xs={4}>{label}:</Col>
          <Col>
            {selectEl}
            {customValueEl}
          </Col>
        </Row>
      );
    },
    [config, setConfigValue]
  );

  return useMemo(() => {
    const { tiers, postsPublished, productsPublished } = state;

    const postsPublishedAfterPicker = (
      <Form.Control
        type="datetime-local"
        size="sm"
        value={postsPublished.after}
        onChange={(e) =>
          setConfigValue("include", "posts.published", {
            ...state.postsPublished,
            after: e.currentTarget.value
          })
        }
      />
    );

    const postsPublishedBeforePicker = (
      <Form.Control
        type="datetime-local"
        size="sm"
        value={postsPublished.before}
        onChange={(e) =>
          setConfigValue("include", "posts.published", {
            ...state.postsPublished,
            before: e.currentTarget.value
          })
        }
      />
    );

    const productsPublishedAfterPicker = (
      <Form.Control
        type="datetime-local"
        size="sm"
        value={productsPublished.after}
        onChange={(e) =>
          setConfigValue("include", "products.published", {
            ...state.productsPublished,
            after: e.currentTarget.value
          })
        }
      />
    );

    const productsPublishedBeforePicker = (
      <Form.Control
        type="datetime-local"
        size="sm"
        value={productsPublished.before}
        onChange={(e) =>
          setConfigValue("include", "products.published", {
            ...state.productsPublished,
            before: e.currentTarget.value
          })
        }
      />
    );

    return (
      <Tabs
        defaultActiveKey="include-general"
        variant="underline"
        className="mb-2 py-1 px-3"
      >
        <Tab className="pb-2" eventKey="include-general" title="General">
          <Container fluid>
            <CheckboxRow
              config={["include", "locked.content"]}
              label="Locked content"
              helpTooltip="Process content even if it is unviewable by you."
              ariaLabel="Include locked content"
            />
            <CheckboxRow
              config={["include", "campaign.info"]}
              label="Campaign info"
              helpTooltip="Save campaign info."
              ariaLabel="Save campaign information"
            />
            <CheckboxRow
              config={["include", "content.info"]}
              label="Content info"
              helpTooltip="Save content info."
              ariaLabel="Save content information"
            />
            {createCustomSelectRow({
              prop: "content.media",
              label: "Content media",
              selectOptions: [
                { value: "all", label: "All media", default: true },
                { value: "custom", label: "Select type" },
                { value: "none", label: "None" }
              ],
              customValues: [
                { value: "image", label: "Image" },
                { value: "video", label: "Video" },
                { value: "audio", label: "Audio" },
                { value: "attachment", label: "Attachment" },
                { value: "file", label: "File" }
              ],
              helpTooltip: "The type of content media to download.",
              ariaLabel: "Type of content media to download"
            })}
            {createCustomSelectRow({
              prop: "preview.media",
              label: "Preview media",
              selectOptions: [
                { value: "all", label: "All media", default: true },
                { value: "custom", label: "Select type" },
                { value: "none", label: "None" }
              ],
              customValues: [
                { value: "image", label: "Image" },
                { value: "video", label: "Video" },
                { value: "audio", label: "Audio" }
              ],
              helpTooltip: "The type of preview media to download.",
              ariaLabel: "Type of preview media to download"
            })}
            <CheckboxRow
              config={["include", "all.media.variants"]}
              label="All media variants"
              helpTooltip="Download all media variants."
              helpHasMoreInfo
              ariaLabel="Download all media variants"
            />
            <Row className="py-1">
              <Col xs={4}>Filter by filename:</Col>
              <Col>
                <TextInputRow
                  as="inputGroup"
                  config={["include", "images.by.filename"]}
                  label="Images"
                  helpTooltip="Only include images with filenames matching the provided pattern. Leave blank to download all images."
                  helpHasMoreInfo
                  ariaLabel="Filter images by filename"
                />
                <TextInputRow
                  as="inputGroup"
                  config={["include", "audio.by.filename"]}
                  label="Audio"
                  helpTooltip="Only include audio items with filenames matching the provided pattern. Leave blank to download all audio files."
                  helpHasMoreInfo
                  ariaLabel="Filter audio items by filename"
                />
                <TextInputRow
                  as="inputGroup"
                  config={["include", "attachments.by.filename"]}
                  label="Attachments"
                  helpTooltip="Only include attachments with filenames matching the provided pattern. Leave blank to download all attachments."
                  helpHasMoreInfo
                  ariaLabel="Filter attachments by filename"
                />
              </Col>
            </Row>
          </Container>
        </Tab>

        <Tab className="pb-2" eventKey="include-posts" title="Posts">
          <Container fluid>
            {createCustomSelectRow({
              prop: "posts.in.tier",
              label: "In tier",
              selectOptions: [
                { value: "any", label: "Any tier", default: true },
                { value: "custom", label: "Select" }
              ],
              customValues: (Array.isArray(tiers) ?
                tiers.map((tier) => ({
                  value: tier.id,
                  label: tier.title
                }))
              : []) as CreateCustomSelectRowArgs<"posts.in.tier">["customValues"],
              alert:
                tiers === null || tiers.length === 0 ?
                  <div className="d-flex align-items-center fs-6">
                    <span className="fs-4 material-symbols-outlined pe-1 text-warning">
                      warning
                    </span>{" "}
                    No tier information available
                  </div>
                : undefined,
              helpTooltip:
                "Restrict posts downloaded by the tier(s) they belong to.",
              ariaLabel: "Include posts by tier"
            })}
            {createCustomSelectRow({
              prop: "posts.with.media.type",
              label: "Containing",
              selectOptions: [
                { value: "any", label: "Any media", default: true },
                { value: "custom", label: "Select" },
                { value: "none", label: "No media" }
              ],
              customValues: [
                { value: "image", label: "Image" },
                { value: "video", label: "Video" },
                { value: "audio", label: "Audio" },
                { value: "attachment", label: "Attachment" },
                { value: "podcast", label: "Podcast" }
              ],
              helpTooltip:
                "Restrict posts downloaded by the type of media they contain.",
              ariaLabel: "Include posts containing media type"
            })}
            <Row className="py-1">
              <Col xs={4}>Published:</Col>
              <Col>
                <div className="d-flex align-items-center">
                  <Form.Select
                    size="sm"
                    value={state.postsPublished.type}
                    onChange={(e) =>
                      setConfigValue("include", "posts.published", {
                        ...state.postsPublished,
                        type: e.currentTarget
                          .value as unknown as UIConfig["include"]["posts.published"]["type"]
                      })
                    }
                    aria-label="Include posts by publish date"
                  >
                    <option value="anytime">Any time</option>
                    <option value="after">After</option>
                    <option value="before">Before</option>
                    <option value="between">Between</option>
                  </Form.Select>
                  <HelpIcon
                    className="ms-2"
                    tooltip="Restrict posts downloaded by publish date."
                  />
                </div>
                <div
                  className="py-2"
                  hidden={state.postsPublished.type === "anytime"}
                >
                  {state.postsPublished.type === "after" ?
                    postsPublishedAfterPicker
                  : state.postsPublished.type === "before" ?
                    postsPublishedBeforePicker
                  : <>
                      <InputGroup size="sm" className="mb-2">
                        <InputGroup.Text id="inputGroup-sizing-sm">
                          From
                        </InputGroup.Text>
                        {postsPublishedAfterPicker}
                      </InputGroup>
                      <InputGroup size="sm" className="mb-2">
                        <InputGroup.Text id="inputGroup-sizing-sm">
                          To
                        </InputGroup.Text>
                        {postsPublishedBeforePicker}
                      </InputGroup>
                    </>
                  }
                </div>
              </Col>
            </Row>
            <CheckboxRow
              config={["include", "comments"]}
              label="Comments"
              helpTooltip="Download comments"
              ariaLabel="Download comments"
            />
          </Container>
        </Tab>

        <Tab className="pb-2" eventKey="include-products" title="Products">
          <Container fluid>
            <Row className="py-1">
              <Col xs={4}>Published:</Col>
              <Col>
                <div className="d-flex align-items-center">
                  <Form.Select
                    size="sm"
                    value={state.productsPublished.type}
                    onChange={(e) =>
                      setConfigValue("include", "products.published", {
                        ...state.productsPublished,
                        type: e.currentTarget
                          .value as unknown as UIConfig["include"]["products.published"]["type"]
                      })
                    }
                    aria-label="Include products by publish date"
                  >
                    <option value="anytime">Any time</option>
                    <option value="after">After</option>
                    <option value="before">Before</option>
                    <option value="between">Between</option>
                  </Form.Select>
                  <HelpIcon
                    className="ms-2"
                    tooltip="Restrict products downloaded by publish date."
                  />
                </div>
                <div
                  className="py-2"
                  hidden={state.productsPublished.type === "anytime"}
                >
                  {state.productsPublished.type === "after" ?
                    productsPublishedAfterPicker
                  : state.productsPublished.type === "before" ?
                    productsPublishedBeforePicker
                  : <>
                      <InputGroup size="sm" className="mb-2">
                        <InputGroup.Text id="inputGroup-sizing-sm">
                          From
                        </InputGroup.Text>
                        {productsPublishedAfterPicker}
                      </InputGroup>
                      <InputGroup size="sm" className="mb-2">
                        <InputGroup.Text id="inputGroup-sizing-sm">
                          To
                        </InputGroup.Text>
                        {productsPublishedBeforePicker}
                      </InputGroup>
                    </>
                  }
                </div>
              </Col>
            </Row>
          </Container>
        </Tab>
      </Tabs>
    );
  }, [state, setConfigValue, createCustomSelectRow]);
}

export default IncludeBox;
