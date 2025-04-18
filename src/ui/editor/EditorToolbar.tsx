import { useEditor } from "../contexts/EditorContextProvider";
import type { Editor } from "../../types/App";
import { Button, Container, Nav, Navbar, NavDropdown } from "react-bootstrap";
import { useCommands } from "../contexts/CommandsProvider";
import { useEffect, useMemo, useState } from "react";
import type { RecentDocument } from "../../core/util/RecentDocuments";
import ToolbarButton from "./components/ToolbarButton";

const getEditorName = (editor: Editor) => {
  return `${editor.name}${editor.modified ? "*" : ""}`;
};

function EditorToolbar() {
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
      window.mainAPI.on("recentDocumentsInfo", (info) => {
        setRecentDocuments(info.entries);
      })
    ];

    return () => {
      removeListenerCallbacks.forEach((cb) => cb());
    };
  }, []);

  const recentDocumentSplitItems = useMemo(
    () =>
      recentDocuments.map((doc) => ({
        label: doc.name,
        onClick: () => openFile(doc.filePath)
      })),
    [recentDocuments, openFile]
  );

  return (
    <Navbar bg="primary" sticky="top" style={{ height: "3rem" }}>
      <Container className="justify-content-start">
        {activeEditor ?
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
        : null}
        <ToolbarButton icon="new_window" onClick={createEditor} tooltip="New" />
        <ToolbarButton
          icon="folder_open"
          onClick={() => openFile()}
          tooltip="Open file"
          split={recentDocumentSplitItems}
        />
        <ToolbarButton
          icon="save"
          disabled={!activeEditor}
          onClick={save}
          tooltip="Save"
          split={[
            { label: "Save", onClick: save },
            { label: "Save as...", onClick: saveAs },
            { label: "Preview", onClick: preview }
          ]}
        />
        <ToolbarButton
          icon="play_arrow"
          disabled={!activeEditor}
          onClick={startDownload}
          tooltip="Start download"
        />
      </Container>
      {activeEditor ?
        <Container className="justify-content-end">
          <Nav.Item>
            <Button size="sm" className="ms-auto" onClick={closeActiveEditor}>
              <span
                className="material-icons"
                style={{ lineHeight: "inherit" }}
              >
                close
              </span>
            </Button>
          </Nav.Item>
        </Container>
      : null}
    </Navbar>
  );
}

export default EditorToolbar;
