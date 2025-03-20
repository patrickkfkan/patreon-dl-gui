import AboutModal from "./AboutModal";
import ConfirmSaveModal from "./ConfirmSaveModal";
import DownloaderModal from "./DownloaderModal";
import HelpModal from "./HelpModal";
import PreviewModal from "./PreviewModal";

function ModalWrapper() {
  return (
    <>
      <AboutModal />
      <ConfirmSaveModal />
      <DownloaderModal />
      <HelpModal />
      <PreviewModal />
    </>
  );
}

export default ModalWrapper;
