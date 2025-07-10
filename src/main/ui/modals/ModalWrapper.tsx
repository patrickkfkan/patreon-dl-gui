import { ToastContainer } from "react-toastify";
import AboutModal from "./AboutModal";
import ConfirmSaveModal from "./ConfirmSaveModal";
import DownloaderModal from "./DownloaderModal";
import HelpModal from "./HelpModal";
import PreviewModal from "./PreviewModal";
import YouTubeConfiguratorModal from "./YouTubeConfiguratorModal";
import WebBRowserSettingsModal from "./WebBrowserSettingsModal";

function ModalWrapper() {
  return (
    <>
      <AboutModal />
      <ConfirmSaveModal />
      <DownloaderModal />
      <HelpModal />
      <PreviewModal />
      <YouTubeConfiguratorModal />
      <WebBRowserSettingsModal />
      <ToastContainer />
    </>
  );
}

export default ModalWrapper;
