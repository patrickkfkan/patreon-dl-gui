import { useEditor } from "./contexts/EditorContextProvider";
import type { Editor } from "../types/App";
import {
  Button,
  ButtonGroup,
  Container,
  Dropdown,
  Nav,
  Navbar,
  NavDropdown
} from "react-bootstrap";
import { useCommands } from "./contexts/CommandsProvider";
import { useEffect, useMemo, useState } from "react";
import type { RecentDocument } from "../core/util/RecentDocuments";

interface ToolbarButton {
  icon: string;
  classes?: string;
  onClick: () => void;
  tooltip: string;
  split?: {
    label: string;
    onClick: () => void;
  }[];
}

const getEditorName = (editor: Editor) => {
  return `${editor.name}${editor.modified ? "*" : ""}`;
};

function Toolbar() {
  const { editors, activeEditor, setActiveEditor } = useEditor();
  const [recentDocuments, setRecentDocuments] = useState<
    readonly RecentDocument[]
  >([]);
  const {
    createEditor,
    openFile,
    save,
    saveAs,
    preview,
    startDownload,
    closeActiveEditor
  } = useCommands();

  useEffect(() => {
    const removeListenerCallbacks = [
      window.electronAPI.on("recentDocumentsInfo", (info) => {
        setRecentDocuments(info.entries);
      })
    ];

    return () => {
      removeListenerCallbacks.forEach((cb) => cb());
    };
  }, []);

  const disabledClass = activeEditor ? "" : "disabled";

  const recentDocumentSplitItems = useMemo(
    () =>
      recentDocuments.map((doc) => ({
        label: doc.name,
        onClick: () => openFile(doc.filePath)
      })),
    [recentDocuments, openFile]
  );

  const mainButtons: ToolbarButton[] = [
    {
      icon: "new_window",
      classes: undefined,
      onClick: createEditor,
      tooltip: "New"
    },
    {
      icon: "folder_open",
      classes: undefined,
      onClick: () => openFile(),
      tooltip: "Open file",
      split: recentDocumentSplitItems
    },
    {
      icon: "save",
      classes: disabledClass,
      onClick: save,
      tooltip: "Save",
      split: [
        { label: "Save", onClick: save },
        { label: "Save as...", onClick: saveAs },
        { label: "Preview", onClick: preview }
      ]
    },
    {
      icon: "play_arrow",
      classes: disabledClass,
      onClick: startDownload,
      tooltip: "Start download"
    }
  ];

  const createButton = (props: ToolbarButton) => {
    const { icon, classes, onClick, tooltip, split } = props;
    const buttonClasses = !split
      ? `rounded mx-1 ${classes}`
      : `rounded-start ${classes}`;
    const button = (
      <Button
        size="sm"
        variant="dark"
        className={buttonClasses}
        title={tooltip}
        onClick={onClick}
        aria-label={tooltip}
      >
        <span
          className="material-symbols-outlined"
          style={{ lineHeight: "inherit" }}
        >
          {icon}
        </span>
      </Button>
    );
    if (!split || split.length === 0) {
      return button;
    }
    const dropdownItems = split.map(({ label, onClick }) => (
      <Dropdown.Item key={`${icon}-split-${label}`} href="#" onClick={onClick}>
        {label}
      </Dropdown.Item>
    ));

    return (
      <Dropdown as={ButtonGroup} className={`mx-1 ${disabledClass}`}>
        {button}
        <Dropdown.Toggle
          split
          variant="dark"
          className={`rounded-end ${classes}`}
        />
        <Dropdown.Menu variant="dark">{dropdownItems}</Dropdown.Menu>
      </Dropdown>
    );
  };

  return (
    <Navbar
      variant="dark"
      sticky="top"
      className="bg-dark my-2 border border-dark"
    >
      <Container className="justify-content-start">
        {activeEditor ? (
          <NavDropdown
            title={getEditorName(activeEditor)}
            className="me-2"
            menuVariant="dark"
          >
            {editors.map((editor) => (
              <NavDropdown.Item
                key={`editor-${editor.id}`}
                href="#"
                onClick={() => setActiveEditor(editor)}
                className={`${editor.id === activeEditor.id ? "fw-bold text-info" : ""}`}
              >
                {getEditorName(editor)}
              </NavDropdown.Item>
            ))}
          </NavDropdown>
        ) : null}
        {mainButtons.map((button) => (
          <Nav.Item key={`toolbar-item-${button.icon}`}>
            {createButton(button)}
          </Nav.Item>
        ))}
      </Container>
      {activeEditor ? (
        <Container className="justify-content-end">
          <Nav.Item>
            <Button
              size="sm"
              variant="dark"
              className="rounded mx-1 ms-auto"
              onClick={closeActiveEditor}
            >
              <span
                className="material-icons"
                style={{ lineHeight: "inherit" }}
              >
                close
              </span>
            </Button>
          </Nav.Item>
        </Container>
      ) : null}
    </Navbar>
  );
}

export default Toolbar;
