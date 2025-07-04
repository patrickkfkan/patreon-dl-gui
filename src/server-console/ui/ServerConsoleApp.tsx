import "bootswatch/dist/darkly/bootstrap.min.css";
import "material-icons/iconfont/material-icons.css";
import "material-symbols";
import "./styles/main.css";
import "../../common/ui/styles/components.css";
import { useEffect } from "react";
import { Stack } from "react-bootstrap";
import ServerListTable from "./components/ServerListTable";
import ServerConsoleToolbar from "./ServerConsoleToolbar";
import ServerFormModal from "./components/ServerFormModal";

function ServerConsoleApp() {
  useEffect(() => {
    window.serverConsoleAPI.emitMainEvent("uiReady");
  }, []);

  return (
    <>
      <Stack className="vw-100 vh-100">
        <ServerConsoleToolbar />
        <ServerListTable />
      </Stack>
      <ServerFormModal />
    </>
  );
}

export default ServerConsoleApp;
