import { useState } from "react";
import { Modal, Button, Form } from "react-bootstrap";

interface ExternalDownloadModalProps {
  show: boolean;
  onHide: () => void;
}

function ExternalDownloadModal({ show, onHide }: ExternalDownloadModalProps) {
  const [url, setUrl] = useState("");
  const [creatorName, setCreatorName] = useState("");

  const handleDownload = () => {
    window.mainAPI.invoke("downloadExternal", {
      url,
      creatorName
    });
    onHide();
  };

  return (
    <Modal show={show} onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>Download from External Link</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>URL</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Creator Name</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter creator name"
              value={creatorName}
              onChange={(e) => setCreatorName(e.target.value)}
            />
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
        <Button variant="primary" onClick={handleDownload}>
          Download
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default ExternalDownloadModal;
