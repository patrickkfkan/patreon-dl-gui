import type {
  DownloaderEndInfo,
  DownloaderInitInfo
} from "../../types/MainEvents";
import type { DownloaderLogMessage } from "../../core/DownloaderConsoleLogger";
import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import type { JSX } from "react";
import { Button, Modal } from "react-bootstrap";
import ReactDOMServer from "react-dom/server";

const MAX_MESSAGES = 1000;

type DownloaderState =
  | {
      status: "init";
      info: DownloaderInitInfo;
    }
  | {
      status: "running";
    }
  | {
      status: "end";
      info: DownloaderEndInfo;
    };

type ContentType = "string" | "element" | "object" | "log";
type ContentValue<T extends ContentType> =
  T extends "string" ? string
  : T extends "element" ? JSX.Element
  : T extends "object" ? object
  : T extends "log" ? DownloaderLogMessage
  : never;

interface ContentsScrollParams {
  autoScroll: boolean;
  ignoreNextScroll: boolean;
}

function DownloaderModal() {
  const [state, setState] = useState<DownloaderState | null>(null);
  const [show, setShow] = useState(false);
  const contentsBufferRef = useRef("");
  const contentsFlushTimerRef = useRef<NodeJS.Timeout>(null);
  const contentsElRef = useRef<HTMLDivElement>(null);
  const contentsScrollParamsRef = useRef<ContentsScrollParams>({
    autoScroll: true,
    ignoreNextScroll: false
  });
  const messagesDisplayedCountRef = useRef(0);

  const flushContentsBuffer = useCallback(() => {
    const contentsEl = contentsElRef.current;
    if (contentsEl) {
      contentsEl.innerHTML += contentsBufferRef.current;
      contentsBufferRef.current = "";
      if (messagesDisplayedCountRef.current > MAX_MESSAGES) {
        for (
          let i = 0;
          i < messagesDisplayedCountRef.current - MAX_MESSAGES;
          i++
        ) {
          contentsEl.firstChild?.remove();
        }
        messagesDisplayedCountRef.current = MAX_MESSAGES;
      }
      if (contentsScrollParamsRef.current.autoScroll) {
        contentsEl.scrollTop = contentsEl.scrollHeight;
      }
    }
  }, []);

  const clearContentsFlushTimer = useCallback(() => {
    if (contentsFlushTimerRef.current) {
      clearTimeout(contentsFlushTimerRef.current);
      contentsFlushTimerRef.current = null;
    }
  }, []);

  const startContentsFlushTimer = useCallback(() => {
    if (contentsFlushTimerRef.current) {
      return;
    }
    contentsFlushTimerRef.current = setTimeout(() => {
      flushContentsBuffer();
      contentsFlushTimerRef.current = null;
    }, 200);

    return () => {
      clearContentsFlushTimer();
    };
  }, [flushContentsBuffer, clearContentsFlushTimer]);

  const updateContents = useCallback(
    <T extends ContentType>(
      type: T,
      value: ContentValue<T>,
      append = false
    ) => {
      let content = "";
      switch (type) {
        case "string":
          content = value as string;
          break;
        case "object":
          content = JSON.stringify(value, null, 2);
          break;
        case "element":
          content = ReactDOMServer.renderToString(value as JSX.Element);
          break;
        case "log":
          content = (value as DownloaderLogMessage).text;
          break;
      }
      if (!append) {
        contentsBufferRef.current = "";
        if (contentsElRef.current) {
          contentsElRef.current.innerHTML = "";
        }
        messagesDisplayedCountRef.current = 0;
      }
      if (content) {
        contentsBufferRef.current += `<div>${content}</div>`;
        messagesDisplayedCountRef.current++;
      }
      startContentsFlushTimer();
    },
    [clearContentsFlushTimer, startContentsFlushTimer]
  );

  const clearMessages = useCallback(() => {
    updateContents("string", "");
  }, [updateContents]);

  const wrapText = useCallback(() => {
    const contentsEl = contentsElRef.current;
    if (contentsEl) {
      if (contentsEl.style.whiteSpace === "pre") {
        contentsEl.style.whiteSpace = "pre-wrap";
      } else {
        contentsEl.style.whiteSpace = "pre";
      }
    }
  }, []);

  const close = useCallback(() => {
    setShow(false);
  }, []);

  const end = useCallback(async () => {
    await window.mainAPI.emitMainEvent("downloaderModalClose");
  }, []);

  const confirmStartDownload = useCallback(
    (confirmed: boolean) => {
      window.mainAPI.emitMainEvent("confirmStartDownload", {
        confirmed
      });
      if (!confirmed) {
        close();
      }
    },
    [close]
  );

  useEffect(() => {
    const removeListenerCallbacks = [
      window.mainAPI.on("downloaderInit", (info) => {
        contentsScrollParamsRef.current.autoScroll = false;
        if (info.hasError) {
          updateContents("string", info.error);
        } else {
          const { fileLoggerConfig, downloaderConfig } = info;
          let s = "";
          if (fileLoggerConfig.enabled) {
            s += `Log file: ${fileLoggerConfig.logFilePath}\n\n`;
          }
          s += "Downloader config\n";
          s += "-----------------\n";
          s += JSON.stringify(downloaderConfig, null, 2);
          updateContents("string", s);
        }
        setState({
          status: "init",
          info
        });
        setShow(true);
        if (!info.hasError && !info.prompt) {
          confirmStartDownload(true);
        }
      }),
      window.mainAPI.on("downloaderStart", () => {
        contentsScrollParamsRef.current.autoScroll = true;
        setState({
          status: "running"
        });
        setShow(true);
      }),
      window.mainAPI.on("downloaderEnd", (info) => {
        clearContentsFlushTimer();
        flushContentsBuffer();
        if (info.hasError) {
          updateContents(
            "string",
            `Downloader exited with uncaught error: ${info.error}`,
            true
          );
        } else if (info.aborted) {
          updateContents("string", `Downloader exited due to abort`, true);
        } else {
          updateContents("string", `Downloader exited`, true);
        }
        setState({
          status: "end",
          info
        });
        setShow(true);
      }),
      window.mainAPI.on("downloaderLogMessage", (message) => {
        updateContents("log", message, true);
      })
    ];

    return () => {
      removeListenerCallbacks.forEach((cb) => cb());
    };
  }, [
    updateContents,
    clearContentsFlushTimer,
    flushContentsBuffer,
    confirmStartDownload
  ]);

  const abortDownload = useCallback(async () => {
    await window.mainAPI.invoke("abortDownload");
  }, []);

  const title = useMemo(() => {
    if (!state) {
      return "";
    }
    switch (state.status) {
      case "init":
        return state.info.hasError ?
            "Could not create downloader instance"
          : "Downloader ready";
      case "running":
        return "Download in progress...";
      case "end":
        return (
          state.info.hasError ? "Download ended with uncaught error"
          : state.info.aborted ? "Download aborted"
          : "Download finished"
        );
    }
  }, [state]);

  const message =
    state?.status === "init" && !state.info.hasError ?
      state.info.prompt ?
        "Proceed?"
      : "Download will begin shortly..."
    : null;

  const headerButtons = useMemo(() => {
    if (!state) {
      return;
    }
    return (
      <>
        <Button
          size="sm"
          variant="dark"
          className="rounded me-2"
          title="Wrap text"
          onClick={wrapText}
          aria-label="Wrap text"
        >
          <span
            className="material-symbols-outlined"
            style={{ lineHeight: "inherit" }}
          >
            wrap_text
          </span>
        </Button>
        <Button
          size="sm"
          variant="dark"
          className="rounded me-2"
          title="Clear messages"
          onClick={clearMessages}
          aria-label="Clear messages"
        >
          <span
            className="material-symbols-outlined"
            style={{ lineHeight: "inherit" }}
          >
            delete
          </span>
        </Button>
      </>
    );
  }, [state]);

  const footerButtons = useMemo(() => {
    if (!state) {
      return null;
    }
    switch (state.status) {
      case "init":
        return (
          state.info.hasError ?
            <Button variant="secondary" onClick={close} aria-label="Close">
              Close
            </Button>
          : state.info.prompt ?
            <>
              <Button
                variant="secondary"
                onClick={() => confirmStartDownload(false)}
                aria-label="Cancel download"
              >
                Cancel
              </Button>
              <Button
                onClick={() => confirmStartDownload(true)}
                aria-label="Proceed"
              >
                Proceed
              </Button>
            </>
          : null
        );
      case "running":
        return (
          <Button
            variant="danger"
            onClick={abortDownload}
            aria-label="Abort download"
          >
            Abort
          </Button>
        );
      case "end":
        return (
          <Button variant="secondary" onClick={close} aria-label="Close">
            Close
          </Button>
        );
    }
  }, [state]);

  const onContentsScroll = useCallback(() => {
    const bodyEl = contentsElRef.current;
    const scrollParams = contentsScrollParamsRef.current;
    if (bodyEl) {
      if (!scrollParams.ignoreNextScroll) {
        scrollParams.autoScroll =
          bodyEl.scrollTop >= bodyEl.scrollHeight - bodyEl.clientHeight - 100;
      } else {
        scrollParams.ignoreNextScroll = false;
      }
    }
  }, []);

  if (!state) {
    return null;
  }

  return (
    <>
      <Modal
        show={show}
        onHide={close}
        onExited={end}
        backdrop="static"
        keyboard={false}
        scrollable={true}
        size="xl"
        fullscreen="lg-down"
        centered
      >
        <Modal.Header className="bg-dark">
          <Modal.Title>
            <div className="d-flex flex-column">
              <span>{title}</span>
              {message ?
                <span className="mt-2 fs-5">{message}</span>
              : null}
            </div>
          </Modal.Title>
          <div className="d-flex flex-grow-1 justify-content-end">
            {headerButtons}
          </div>
        </Modal.Header>
        <Modal.Body
          className="p-2 flex-grow-1 overflow-auto bg-black text-light font-monospace"
          style={{ whiteSpace: "pre" }}
          ref={(node) => {
            contentsElRef.current = node;
            if (node) {
              flushContentsBuffer();
            }
          }}
          onScroll={onContentsScroll}
        ></Modal.Body>
        <Modal.Footer className="bg-dark">{footerButtons}</Modal.Footer>
      </Modal>
    </>
  );
}

export default DownloaderModal;
