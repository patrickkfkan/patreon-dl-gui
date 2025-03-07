import "bootswatch/dist/superhero/bootstrap.min.css";
import "material-icons/iconfont/material-icons.css";
import "material-symbols";
import "./styles/main.css";
import { JSX, useCallback, useEffect, useState } from "react";
import { Button, Spinner } from "react-bootstrap";

interface BootstrapState {
  message: JSX.Element | string;
  buttons?: {
    label: string;
    variant?: "primary" | "secondary" | "danger";
    onClick: () => void;
  }[];
}

function Bootstrap() {
  const [state, setState] = useState<BootstrapState>({
    message: (
      <div className="d-flex flex-grow-1 align-items-center justify-content-center">
        Starting patreon-dl-gui...
      </div>
    )
  });

  useEffect(() => {
    window.bootstrapAPI.emitMainEvent("uiReady");
  }, []);

  const confirmInstallDependencies = useCallback((confirmed: boolean) => {
    window.bootstrapAPI.emitMainEvent("confirmInstallDependencies", {
      confirmed
    });
  }, []);

  const exit = useCallback(() => {
    window.bootstrapAPI.emitMainEvent("exit");
  }, []);

  useEffect(() => {
    const callbacks = [
      window.bootstrapAPI.on("promptInstallDependencies", (dependencies) => {
        setState({
          message: (
            <div className="pt-1">
              <div>
                patreon-dl-gui requires the following dependency to be
                installed:
                <ul className="pt-3">
                  {dependencies.map(({ name, version }) => (
                    <li key={`${name}-${version}`}>
                      {name} v{version}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-4">Proceed with installation?</div>
            </div>
          ),
          buttons: [
            {
              label: "Exit",
              variant: "secondary",
              onClick: () => {
                confirmInstallDependencies(false);
              }
            },
            {
              label: "Proceed",
              onClick: () => {
                confirmInstallDependencies(true);
              }
            }
          ]
        });
      }),

      window.bootstrapAPI.on("installDependencyProgress", (progress) => {
        const message =
          progress.status === "downloading"
            ? `Downloading ${progress.dependency.name}...${progress.downloadProgress ? `${progress.downloadProgress}%` : ""}`
            : `Installing ${progress.dependency.name}...`;
        setState({
          message: (
            <div className="d-flex flex-grow-1 align-items-center justify-content-center">
              <Spinner size="sm" className="me-2" />
              {message}
            </div>
          )
        });
      }),

      window.bootstrapAPI.on("bootstrapError", (error) => {
        setState({
          message: (
            <div className="d-flex align-items-center pt-2">
              <span className="text-danger material-icons me-1">error</span>
              {error}
            </div>
          ),
          buttons: [{ label: "Exit", variant: "danger", onClick: exit }]
        });
      })
    ];

    return () => {
      callbacks.forEach((cb) => cb());
    };
  }, []);

  document.title = "patreon-dl-gui";

  return (
    <div className="d-flex flex-column vh-100 p-2">
      {state.message}
      {state.buttons ? (
        <div className="flex-grow-1 d-flex align-items-end justify-content-end pb-1">
          {state.buttons.map(({ label, variant, onClick }) => (
            <Button
              key={`btn_${label}`}
              variant={variant}
              className="ms-2"
              style={{ minWidth: "5rem" }}
              onClick={onClick}
            >
              {label}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default Bootstrap;
