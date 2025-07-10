import { Modal } from "react-bootstrap";
import type { ServerListEntry } from "../../types/Server";

export interface ServerErrorModalProps {
  serverListEntry: ServerListEntry & { status: "error" };
  show: boolean;
  onClose: () => void;
}

function ServerErrorModal({ serverListEntry: entry, show, onClose }: ServerErrorModalProps) {
  let headerTitle, messageTitle;
  switch (entry.action) {
    case "start":
      headerTitle = "Failed to start server";
      messageTitle = "The start process returned the following error:";
      break;
    case "stop":
      headerTitle = "Failed to top server";
      messageTitle = "The stop process returned the following error:";
      break;
  }
  return (
    <Modal
      show={show}
      onHide={onClose}
      scrollable={true}
      size="lg"
      centered
    >
      <Modal.Header closeButton>
        <Modal.Title className="text-danger">{headerTitle}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-3 flex-grow-1 overflow-auto bg-dark help-modal-body">
        <div className="mb-4">{messageTitle}</div>
        <pre>
          <code className="text-monospace text-wrap">
            {entry.message}
          </code>
        </pre>
      </Modal.Body>
    </Modal>
  )
}

export default ServerErrorModal;