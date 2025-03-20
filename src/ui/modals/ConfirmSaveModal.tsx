import { useCallback, useEffect, useState } from "react";
import { Button, Modal } from "react-bootstrap";
import type { FileConfig } from "../../types/FileConfig";

function ConfirmSaveModal() {
  const [fileConfig, setFileConfig] = useState<FileConfig<"hasPath"> | null>(
    null
  );
  const [show, setShow] = useState(false);

  useEffect(() => {
    const removeListenerCallbacks = [
      window.mainAPI.on("promptOverwriteOnSave", (config) => {
        setFileConfig(config);
        setShow(true);
      })
    ];

    return () => {
      removeListenerCallbacks.forEach((cb) => cb());
    };
  }, []);

  const confirm = useCallback(() => {
    if (!fileConfig) {
      return;
    }
    setShow(false);
    window.mainAPI.emitMainEvent("confirmSave", {
      confirmed: true,
      config: fileConfig
    });
  }, [fileConfig]);

  const cancel = useCallback(() => {
    window.mainAPI.emitMainEvent("confirmSave", { confirmed: false });
    setShow(false);
  }, []);

  const end = useCallback(() => {
    window.mainAPI.emitMainEvent("endPromptOverwriteOnSave");
  }, []);

  if (!fileConfig) {
    return null;
  }

  const { name, filePath, contents } = fileConfig;

  return (
    <>
      <Modal
        show={show}
        onHide={cancel}
        onExited={end}
        onEscapeKeyDown={cancel}
        backdrop="static"
        scrollable={true}
        size="xl"
        fullscreen="lg-down"
        centered
      >
        <Modal.Header className="bg-dark">
          <Modal.Title>
            <div className="d-flex flex-column">
              <span>{name}</span>
              <span className="fs-6 text-info">{filePath}</span>
              <span className="mt-2 fs-5">
                Overwrite existing file with the following contents?
              </span>
            </div>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body
          className="p-2 flex-grow-1 overflow-auto bg-black text-light font-monospace"
          style={{ whiteSpace: "pre-line", textWrap: "nowrap" }}
        >
          {contents}
        </Modal.Body>
        <Modal.Footer className="bg-dark">
          <Button variant="secondary" onClick={cancel} aria-label="Cancel save">
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={confirm}
            aria-label="Confirm overwrite"
          >
            Overwrite
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default ConfirmSaveModal;
