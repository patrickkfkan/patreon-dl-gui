import { useCallback, useEffect, useState } from "react";
import { Button, Form, Modal, Stack } from "react-bootstrap";
import { WebBrowserSettings } from "../../config/WebBrowserSettings";

function WebBRowserSettingsModal() {
  const [settings, setSettings] = useState<WebBrowserSettings | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const removeListenerCallbacks = [
      window.mainAPI.on("webBrowserSettings", (settings) => {
        setSettings(settings);
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
    window.mainAPI.emitMainEvent("webBrowserSettingsModalClose");
  }, []);

  const toggleClearSessionData = useCallback(async () => {
    if (!settings) {
      return;
    }
    settings.clearSessionDataOnExit = !settings.clearSessionDataOnExit;
    await window.mainAPI.invoke("saveWebBrowserSettings", settings);
    setSettings({...settings});
  }, [settings]);

  const clearSessionData = useCallback(async () => {
    await window.mainAPI.invoke("clearSessionData");
  }, []);

  if (!settings) {
    return null;
  }

  return (
    <>
      <Modal show={show} onHide={hide} onExited={end} centered>
        <Modal.Header className="bg-dark border-0" closeButton></Modal.Header>
        <Modal.Body className="d-flex p-5 pt-0 bg-dark align-items-center flex-column">
          <Stack direction="horizontal" className="w-100 justify-content-between">
            <Form.Check
              id="web-browser-settings-clear-session-data-checkbox"
              checked={settings.clearSessionDataOnExit}
              label="Clear session data on exit"
              onChange={toggleClearSessionData}
            />
            <Button
              href="#"
              onClick={clearSessionData}
            >
              Clear now
            </Button>
          </Stack>
        </Modal.Body>
      </Modal>
    </>
  );
}

export default WebBRowserSettingsModal;
