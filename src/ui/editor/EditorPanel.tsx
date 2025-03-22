import DownloadBox from "./DownloadBox";
import IncludeBox from "./IncludeBox";
import OutputBox from "./OutputBox";
import EmbedsBox from "./EmbedsBox";
import LoggingBox from "./LoggingBox";
import OtherBox from "./OtherBox";
import AlertsBox from "./AlertsBox";
import { useEffect } from "react";
import { Tab, Tabs } from "react-bootstrap";
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
      <Tabs className="w-100 mt-3" defaultActiveKey="editor-include">
        <Tab
          eventKey="editor-include"
          title="Include"
          className="border border-secondary border-top-0"
          tabClassName="px-3"
        >
          <IncludeBox />
        </Tab>
        <Tab
          eventKey="editor-profile"
          title="Output"
          className="border border-secondary border-top-0"
          tabClassName="px-3"
        >
          <OutputBox />
        </Tab>
        <Tab
          eventKey="editor-embeds"
          title="Embeds"
          className="border border-secondary border-top-0"
          tabClassName="px-3"
        >
          <EmbedsBox />
        </Tab>
        <Tab
          eventKey="editor-network"
          title="Network"
          className="border border-secondary border-top-0"
          tabClassName="px-3"
        >
          <NetworkBox />
        </Tab>
        <Tab
          eventKey="editor-logging"
          title="Logging"
          className="border border-secondary border-top-0"
          tabClassName="px-3"
        >
          <LoggingBox />
        </Tab>
        <Tab
          eventKey="editor-other"
          title="Other"
          className="border border-secondary border-top-0 py-1"
          tabClassName="px-3"
        >
          <OtherBox />
        </Tab>
      </Tabs>
    </>
  );
}

export default EditorPanel;
