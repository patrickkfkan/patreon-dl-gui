import { useEditor } from "../contexts/EditorContextProvider";
import { Accordion } from "react-bootstrap";
import { useCallback, useState } from "react";

function AlertsBox() {
  const { activeEditor, setEditorProp } = useEditor();
  const [visible, setVisibility] = useState(true);

  if (!activeEditor) {
    return null;
  }

  const dismiss = useCallback(() => {
    if (!activeEditor) {
      return;
    }
    setEditorProp(activeEditor, { loadAlerts: undefined });
    setVisibility(false);
  }, [activeEditor]);

  const { loadAlerts } = activeEditor;

  if (!loadAlerts || !visible || loadAlerts.length === 0) {
    return null;
  }

  const contents = loadAlerts.map((alert, i) => (
    <div
      key={`load-alerts-${activeEditor.id}-${i}`}
      className="d-flex align-items-center mb-1"
    >
      <span
        className={`text-${alert.type === "error" ? "danger" : "warning"} material-symbols-outlined me-2 fs-6`}
      >
        {alert.type === "error" ? "error" : "warning"}
      </span>
      <span className="fs-6">{alert.text}</span>
    </div>
  ));

  return (
    <Accordion defaultActiveKey="0" className="mb-3">
      <Accordion.Item eventKey="1">
        <Accordion.Header>
          <span className="material-symbols-outlined text-warning">
            warning
          </span>{" "}
          There were issues loading this config.
          <div className="d-flex flex-grow-1 justify-content-end pe-3">
            <a href="#" onClick={dismiss}>
              Dismiss
            </a>
          </div>
        </Accordion.Header>
        <Accordion.Body>{contents}</Accordion.Body>
      </Accordion.Item>
    </Accordion>
  );
}

export default AlertsBox;
