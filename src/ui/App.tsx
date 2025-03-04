import EditorPanel from "./editor/EditorPanel";
import { EditorContextProvider } from "./contexts/EditorContextProvider";
import Toolbar from "./Toolbar";
import { ConfigProvider } from "./contexts/ConfigProvider";
import PreviewModal from "./modals/PreviewModal";
import ConfirmSaveModal from "./modals/ConfirmSaveModal";
import DownloaderModal from "./modals/DownloaderModal";
import "bootswatch/dist/superhero/bootstrap.min.css";
import "material-icons/iconfont/material-icons.css";
import "material-symbols";
import "./styles/main.css";
import { useEffect } from "react";
import { Col, Container } from "react-bootstrap";
import { CommandsProvider } from "./contexts/CommandsProvider";
import HelpModal from "./modals/HelpModal";
import AboutModal from "./modals/AboutModal";

function App() {
  useEffect(() => {
    window.electronAPI.emitMainEvent("uiReady");
  }, []);

  return (
    <EditorContextProvider>
      <Container fluid>
        <Col lg={8} md={10} sm={10} xl={7} xxl={6} className="mx-auto mb-3">
          <CommandsProvider>
            <Toolbar />
            <ConfigProvider>
              <EditorPanel />
            </ConfigProvider>
          </CommandsProvider>
        </Col>
      </Container>
      <PreviewModal />
      <ConfirmSaveModal />
      <DownloaderModal />
      <HelpModal />
      <AboutModal />
    </EditorContextProvider>
  );
}

export default App;
