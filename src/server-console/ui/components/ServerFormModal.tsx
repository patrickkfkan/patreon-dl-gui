import { useCallback, useEffect, useReducer, useState } from "react";
import { Button, Modal, Stack } from "react-bootstrap";
import _ from "lodash";
import type { Server } from "../../types/Server";
import TextInputRow from "./TextInputRow";
import SelectRow from "./SelectRow";
import { SaveServerFormResult } from "../../types/ServerConsoleInvocableMethods";

const NEW_SERVER: Server = {
  name: "",
  dataDir: "",
  port: "auto",
  portNumber: 3000
};

const PORT_OPTIONS = [
  { label: "Auto", value: "auto" },
  { label: "Specify a port number", value: "manual" }
];

type ServerPropertyValues = {
  [K in keyof Server]?: Server[K];
};

const serverReducer = (
  current: Server,
  propertyValues: ServerPropertyValues
) => {
  const updated = {
    ...current,
    ...propertyValues
  };
  return _.isEqual(current, updated) ? current : updated;
};

function ServerFormModal() {
  const [mode, setMode] = useState<"add" | "edit" | null>(null);
  const [server, setServerPropertyValues] = useReducer(serverReducer, {
    ...NEW_SERVER
  });
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<
    (SaveServerFormResult & { success: false })["errors"] | null
  >(null);
  const [helpIconsVisible, setHelpIconsVisible] = useState(false);

  useEffect(() => {
    const removeListenerCallbacks = [
      window.serverConsoleAPI.on("showAddServerForm", () => {
        setMode("add");
        setServerPropertyValues({ ...NEW_SERVER });
        setErrors(null);
        setShow(true);
      }),
      window.serverConsoleAPI.on("showEditServerForm", (server) => {
        setMode("edit");
        setServerPropertyValues({ ...server });
        setErrors(null);
        setShow(true);
      }),
      window.serverConsoleAPI.on("closeServerForm", () => {
        setShow(false);
      })
    ];

    return () => {
      removeListenerCallbacks.forEach((cb) => cb());
    };
  }, []);

  const handleSave = useCallback(async () => {
    const result = await window.serverConsoleAPI.invoke(
      "saveServerFormData",
      server
    );
    if (!result.success) {
      setErrors(result.errors);
    }
  }, [server]);

  const handleCancel = useCallback(async () => {
    await window.serverConsoleAPI.invoke("cancelServerForm");
  }, []);

  const toggleHelpIcons = useCallback(() => {
    setHelpIconsVisible(!helpIconsVisible);
  }, [helpIconsVisible]);

  if (!mode) {
    return;
  }

  const headerTitle = mode === "add" ? "Add server" : "Edit server";

  return (
    <Modal
      show={show}
      onHide={handleCancel}
      scrollable
      size="lg"
      backdrop="static"
      keyboard={false}
      centered
    >
      <Modal.Header closeButton>
        <Modal.Title>{headerTitle}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Stack gap={2}>
          <TextInputRow
            type="text"
            label="Name"
            value={server.name}
            onChange={(e) => {
              setServerPropertyValues({ name: e.target.value });
            }}
            error={errors?.name}
            helpTooltip={
              helpIconsVisible ? "Provide a name for the server." : undefined
            }
          />
          <TextInputRow
            type="dir"
            label="Data directory"
            value={server.dataDir}
            onChange={(e) => {
              setServerPropertyValues({ dataDir: e.target.value });
            }}
            error={errors?.dataDir}
            helpTooltip={
              helpIconsVisible ?
                "Set this to the destination directory defined in your downloader's configuration."
              : undefined
            }
          />
          <SelectRow
            label="Port"
            value={server.port}
            onChange={(e) => {
              setServerPropertyValues({
                port: e.target.value as typeof server.port
              });
            }}
            options={PORT_OPTIONS}
            helpTooltip={
              helpIconsVisible ?
                'The port the server will listen on. Set to "Auto" to have one assigned automatically.'
              : undefined
            }
          />
          {server.port === "manual" ?
            <TextInputRow
              type="number"
              value={server.portNumber}
              label="Port number"
              onChange={(e) => {
                setServerPropertyValues({ portNumber: Number(e.target.value) });
              }}
              error={errors?.portNumber}
              helpTooltip={
                helpIconsVisible ?
                  "Enter a valid port number between 1024 and 65535 (inclusive)."
                : undefined
              }
            />
          : null}
        </Stack>
      </Modal.Body>
      <Modal.Footer>
        <Stack direction="horizontal" className="w-100 justify-content-between">
          <div>
            <a href="#" className="link-info" onClick={toggleHelpIcons}>
              {helpIconsVisible ? "Hide" : "Show"} help icons
            </a>
          </div>
          <div>
            <Button variant="secondary" onClick={handleCancel}>
              Cancel
            </Button>
            <Button className="ms-2" onClick={handleSave}>
              {mode === "add" ? "Add" : "Save"}
            </Button>
          </div>
        </Stack>
      </Modal.Footer>
    </Modal>
  );
}

export default ServerFormModal;
