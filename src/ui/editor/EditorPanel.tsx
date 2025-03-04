import DownloadBox from "./DownloadBox";
import IncludeBox from "./IncludeBox";
import OutputBox from "./OutputBox";
import EmbedsBox from "./EmbedsBox";
import LoggingBox from "./LoggingBox";
import OtherBox from "./OtherBox";
import AlertsBox from "./AlertsBox";
import { useEffect } from "react";
import { Container, Tab, Tabs } from "react-bootstrap";
import { useCommands } from "../contexts/CommandsProvider";
import NetworkBox from "./NetworkBox";

function EditorPanel() {
  const { closeActiveEditor } = useCommands();

  useEffect(() => {
    const closeEditorKeyListener = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key.toLowerCase() === "w") {
        event.preventDefault();
        closeActiveEditor();
      }
    };
    window.addEventListener("keyup", closeEditorKeyListener);

    return () => {
      window.removeEventListener("keyup", closeEditorKeyListener);
    };
  }, [closeActiveEditor]);

  return (
    <>
      <AlertsBox />
      <DownloadBox />
      <Container fluid className="p-0">
        <Tabs defaultActiveKey="editor-include" className="mt-3">
          <Tab
            eventKey="editor-include"
            title="Include"
            className="border border-secondary border-top-0"
          >
            <IncludeBox />
          </Tab>
          <Tab
            eventKey="editor-profile"
            title="Output"
            className="border border-secondary border-top-0"
          >
            <OutputBox />
          </Tab>
          <Tab
            eventKey="editor-embeds"
            title="Embeds"
            className="border border-secondary border-top-0"
          >
            <EmbedsBox />
          </Tab>
          <Tab
            eventKey="editor-network"
            title="Network"
            className="border border-secondary border-top-0"
          >
            <NetworkBox />
          </Tab>
          <Tab
            eventKey="editor-logging"
            title="Logging"
            className="border border-secondary border-top-0"
          >
            <LoggingBox />
          </Tab>
          <Tab
            eventKey="editor-other"
            title="Other"
            className="border border-secondary border-top-0 py-1"
          >
            <OtherBox />
          </Tab>
        </Tabs>
      </Container>
    </>
  );
}

export default EditorPanel;
