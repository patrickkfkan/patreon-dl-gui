import { CSSProperties, JSX, useCallback, useEffect, useMemo, useState } from "react";
import { Button, Modal, Spinner } from "react-bootstrap";
import type {
  YouTubeConnectionStatus,
  YouTubeConnectResult,
  YouTubeConnectVerificationInfo
} from "../../core/util/YouTubeConfigurator";
import { showToast } from "../helpers/Toast";

type YouTubeConfiguratorState =
  | {
      phase: "init";
      status: YouTubeConnectionStatus;
    }
  | {
      phase: "connecting";
      info: YouTubeConnectVerificationInfo | null;
    }
  | {
      phase: "endConnect";
      result: YouTubeConnectResult;
    };

function YouTubeConfiguratorModal() {
  const [state, setState] = useState<YouTubeConfiguratorState | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const removeListenerCallbacks = [
      window.mainAPI.on("youtubeConfiguratorStart", (status) => {
        setState({
          phase: "init",
          status
        });
        setShow(true);
      }),
      window.mainAPI.on("youtubeConnectVerificationInfo", (info) => {
        setState({
          phase: "connecting",
          info
        });
        setShow(true);
      }),
      window.mainAPI.on("youtubeConnectResult", (result) => {
        setState({
          phase: "endConnect",
          result
        });
        setShow(true);
      })
    ];

    return () => {
      removeListenerCallbacks.forEach((cb) => cb());
    };
  }, []);

  const disconnect = useCallback(async () => {
    await window.mainAPI.invoke("disconnectYouTube");
  }, []);

  const startConnect = useCallback(async () => {
    await window.mainAPI.invoke("startYouTubeConnect");
    setState({
      phase: "connecting",
      info: null
    });
  }, []);

  const openExternalBrowser = useCallback(async (url?: string) => {
    if (url) {
      await window.mainAPI.invoke("openExternalBrowser", url);
    }
  }, []);

  const hide = useCallback(() => {
    setShow(false);
  }, []);

  const cancelConnect = useCallback(async () => {
    await window.mainAPI.invoke("cancelYouTubeConnect");
    hide();
  }, [hide]);

  const end = useCallback(() => {
    window.mainAPI.emitMainEvent("youtubeConfiguratorModalClose");
  }, []);

  const copyCodeToClipboard = useCallback(() => {
    if (state?.phase === "connecting" && state.info) {
      navigator.clipboard.writeText(state.info.code);
      showToast("success", "Copied to clipboard");
    }
  }, [state]);

  const modalData = (() => {
    if (!state) {
      return null;
    }
    if (state.phase === "init") {
      const msg =
        state.status.isConnected ?
          "You are currently connected to YouTube."
        : "You are not connected to YouTube.";
      const icon: { className: string; style?: CSSProperties; symbol: string; } =
        state.status.isConnected ?
          { className: "text-success", symbol: "check_circle" }
        : { className: "text-danger", style:{position: 'relative', top: '0.1rem'}, symbol: "cancel" };
      const primaryButton =
        state.status.isConnected ?
          <Button variant="danger" onClick={disconnect}>
            Disconnect
          </Button>
        : <Button onClick={startConnect}>Connect</Button>;
      return {
        contents: (
          <div className="py-2 d-flex align-items-center">
            <span
              className={`material-symbols-outlined me-2 ${icon.className}`}
              style={icon.style}
            >
              {icon.symbol}
            </span>
            {msg}
          </div>
        ),
        buttons: [
          <Button variant="secondary" onClick={hide}>
            Close
          </Button>,
          primaryButton
        ]
      };
    } else if (state.phase === "connecting") {
      let contents: JSX.Element;
      if (!state.info) {
        contents = <div className="py-2 d-flex align-items-center"><Spinner size="sm" className="me-2"/>Please wait...</div>;
      } else {
        const { verificationURL, code } = state.info;
        const link = (
          <a
            href="#"
            onClick={() => {
              openExternalBrowser(verificationURL);
            }}
          >
            {verificationURL}
          </a>
        );
        contents = (
          <div>
            <span>Go to {link} and enter the following code:</span>
            <div className="w-100 d-flex justify-content-center align-items-center mt-1 fs-4 text-info">
              {code}
              <Button
                size="sm"
                variant="dark"
                className="rounded"
                title="Copy to clipboard"
                onClick={copyCodeToClipboard}
              >
                <span
                  className="material-icons"
                  style={{ lineHeight: "inherit" }}
                >
                  content_copy
                </span>
              </Button>
            </div>
          </div>
        );
      }
      return {
        contents,
        buttons: [
          <Button variant="secondary" onClick={cancelConnect}>
            Cancel
          </Button>
        ]
      };
    } else if (state.phase === "endConnect") {
      if (state.result.status === "success") {
        return {
          contents: (
            <div className="py-2 d-flex align-items-center">
              <span className="material-symbols-outlined me-2 text-success">
                check_circle
              </span>
              You are now connected to YouTube.
            </div>
          ),
          buttons: [<Button onClick={hide}>Close</Button>]
        };
      } else if (state.result.status === "error") {
        return {
          contents: (
            <>
              <div className="d-flex align-items-center">
                <span className="material-symbols-outlined ms-2 text-danger">
                  error
                </span>
                Failed to connect to YouTube:
              </div>
              <div className="mt-1">{state.result.error}</div>
            </>
          ),
          buttons: [<Button onClick={hide}>Close</Button>]
        };
      }
    }
    return null;
  })();

  if (!modalData) {
    return null;
  }

  return (
    <>
      <Modal
        show={show}
        onHide={hide}
        onExited={end}
        backdrop="static"
        scrollable={true}
        centered
      >
        <Modal.Header>
          <Modal.Title>YouTube Configurator</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-3 flex-grow-1 overflow-auto bg-dark">
          {modalData.contents}
        </Modal.Body>
        <Modal.Footer className="justify-content-center">
          {...modalData.buttons}
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default YouTubeConfiguratorModal;
