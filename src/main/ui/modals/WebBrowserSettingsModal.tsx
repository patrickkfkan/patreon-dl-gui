import { useCallback, useEffect, useState } from "react";
import { Button, Form, Modal, Stack } from "react-bootstrap";
import type { WebBrowserSettings } from "../../config/WebBrowserSettings";

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

  const handleUserAgentChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!settings) {
        return;
      }
      settings.userAgent = e.target.value;
      setSettings({ ...settings });
    },
    [settings]
  );

  const toggleClearSessionData = useCallback(async () => {
    if (!settings) {
      return;
    }
    settings.clearSessionDataOnExit = !settings.clearSessionDataOnExit;
    setSettings({ ...settings });
  }, [settings]);

  const clearSessionData = useCallback(async () => {
    await window.mainAPI.invoke("clearSessionData");
  }, []);

  const handleApply = useCallback(async () => {
    if (!settings) {
      return;
    }
    await window.mainAPI.invoke("saveWebBrowserSettings", settings);
    hide();
  }, [settings, hide]);

  if (!settings) {
    return null;
  }

  return (
    <>
      <Modal show={show} onHide={hide} onExited={end} centered>
        <Modal.Header className="bg-dark border-0" closeButton></Modal.Header>
        <Modal.Body className="d-flex pt-0 pb-4 align-items-center flex-column">
          <div className="w-100 mb-3">
            <div className="mb-2">
              User Agent
              <span className="fst-italic">
                {" "}
                (leave blank unless you know what you&apos;re doing)
              </span>
              :
            </div>
            <Form.Control
              type="text"
              value={settings.userAgent}
              placeholder="(Default)"
              onChange={handleUserAgentChange}
            />
          </div>
          <Stack direction="horizontal" className="w-100" gap={3}>
            <Form.Check
              id="web-browser-settings-clear-session-data-checkbox"
              checked={settings.clearSessionDataOnExit}
              label="Clear session data on exit"
              onChange={toggleClearSessionData}
            />
            <Button href="#" onClick={clearSessionData}>
              Clear now
            </Button>
          </Stack>
        </Modal.Body>
        <Modal.Footer>
          <Stack direction="horizontal" className="w-100 justify-content-end">
            <div>
              <Button variant="secondary" onClick={hide}>
                Cancel
              </Button>
              <Button className="ms-2" onClick={handleApply}>
                Apply
              </Button>
            </div>
          </Stack>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default WebBRowserSettingsModal;
