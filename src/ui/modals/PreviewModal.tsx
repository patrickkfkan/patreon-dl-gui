import type { FileConfig } from "../../types/FileConfig";
import { useCallback, useEffect, useState } from "react";
import { Button, Modal } from "react-bootstrap";
import { showToast } from "../helpers/Toast";

function PreviewModal() {
  const [fileConfig, setFileConfig] = useState<FileConfig | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const removeListenerCallbacks = [
      window.mainAPI.on("previewInfo", (info) => {
        setFileConfig(info);
        setShow(true);
      })
    ];

    return () => {
      removeListenerCallbacks.forEach((cb) => cb());
    };
  }, []);

  const copyToClipboard = useCallback(() => {
    if (!fileConfig) {
      return;
    }
    navigator.clipboard.writeText(fileConfig.contents);
    showToast("success", "Config copied to clipboard");
  }, [fileConfig]);

  const hide = useCallback(() => {
    setShow(false);
  }, []);

  const end = useCallback(async () => {
    await window.mainAPI.emitMainEvent("previewModalClose");
  }, []);

  if (!fileConfig) {
    return null;
  }

  const { name, filePath, contents } = fileConfig;

  return (
    <>
      <Modal
        show={show}
        onHide={hide}
        onExited={end}
        scrollable={true}
        size="xl"
        fullscreen="lg-down"
        centered
      >
        <Modal.Header className="bg-dark" closeButton>
          <Modal.Title>
            <div className="d-flex flex-column">
              <span>{name}</span>
              {filePath ?
                <span className="fs-6 text-info">{filePath}</span>
              : null}
            </div>
          </Modal.Title>
          <div className="d-flex flex-grow-1 justify-content-end">
            <Button
              size="sm"
              variant="dark"
              className="rounded me-2"
              title="Copy to clipboard"
              onClick={copyToClipboard}
            >
              <span
                className="material-icons"
                style={{ lineHeight: "inherit" }}
              >
                content_copy
              </span>
            </Button>
          </div>
        </Modal.Header>
        <Modal.Body
          className="p-2 flex-grow-1 overflow-auto bg-black text-light font-monospace"
          style={{ whiteSpace: "pre-line", textWrap: "nowrap" }}
        >
          {contents}
        </Modal.Body>
      </Modal>
    </>
  );
}

export default PreviewModal;
