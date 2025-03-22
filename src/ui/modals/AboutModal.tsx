import { useCallback, useEffect, useState } from "react";
import { Modal } from "react-bootstrap";
import type { AboutInfo } from "../../types/MainEvents";

function AboutModal() {
  const [info, setInfo] = useState<AboutInfo | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const removeListenerCallbacks = [
      window.mainAPI.on("aboutInfo", (info) => {
        setInfo(info);
        setShow(true);
      })
    ];

    return () => {
      removeListenerCallbacks.forEach((cb) => cb());
    };
  }, []);

  const hide = useCallback(() => {
    setShow(false);
  }, []);

  const end = useCallback(() => {
    window.mainAPI.emitMainEvent("aboutModalClose");
  }, []);

  if (!info) {
    return null;
  }

  const { appName, appVersion, appURL } = info;

  return (
    <>
      <Modal show={show} onHide={hide} onExited={end} centered>
        <Modal.Header className="bg-dark border-0" closeButton></Modal.Header>
        <Modal.Body className="d-flex p-5 pt-0 bg-dark align-items-center flex-column">
          <div className="fs-4">{appName}</div>
          <div>v{appVersion}</div>
          <div className="mt-3">
            <a
              href="#"
              onClick={async (e) => {
                e.preventDefault();
                await window.mainAPI.invoke("openExternalBrowser", appURL);
              }}
            >
              {appURL}
            </a>
          </div>
        </Modal.Body>
      </Modal>
    </>
  );
}

export default AboutModal;
