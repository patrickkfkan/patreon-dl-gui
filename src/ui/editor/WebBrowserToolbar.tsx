import { Button, Container, Form, InputGroup, Navbar } from "react-bootstrap";
import { useCommands } from "../contexts/CommandsProvider";
import type { KeyboardEvent } from "react";
import { useEffect, useRef, useState } from "react";
import ToolbarButton from "./components/ToolbarButton";
import type { WebBrowserPageNavigatedInfo } from "../../types/MainEvents";

function WebBrowserToolbar() {
  const urlInputRef = useRef<HTMLInputElement>(null);
  const [pageInfo, setPageInfo] = useState<WebBrowserPageNavigatedInfo | null>(
    null
  );
  const [editedURL, setEditedURL] = useState("");
  const { gotoURL, gotoHome, goBack, goForward } = useCommands().webBrowser;

  useEffect(() => {
    const removeListenerCallbacks = [
      window.mainAPI.on("browserPageNavigated", (info) => {
        setPageInfo(info);
        setEditedURL(info.url);
      })
    ];

    return () => {
      removeListenerCallbacks.forEach((cb) => cb());
    };
  }, []);

  const handleURLInputKeydown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      if (editedURL.trim() === "") {
        return;
      }
      gotoURL(editedURL);
      if (urlInputRef.current) {
        urlInputRef.current.blur();
      }
    } else if (e.key === "Escape") {
      setEditedURL(pageInfo?.url || "");
    }
  };

  return (
    <Navbar id="web-browser-toolbar" sticky="top" style={{ height: "3rem" }}>
      <Container>
        <ToolbarButton
          disabled={!pageInfo?.canGoBack}
          icon="chevron_left"
          className="nav"
          tooltip="Go back one page"
          onClick={goBack}
        />
        <ToolbarButton
          disabled={!pageInfo?.canGoForward}
          icon="chevron_right"
          className="nav"
          tooltip="Go foward one page"
          onClick={goForward}
        />
        <ToolbarButton
          icon="home"
          className="nav"
          iconClassName="fs-5"
          tooltip="Go to Patreon homepage"
          onClick={gotoHome}
        />
        <InputGroup>
          <Form.Control
            ref={urlInputRef}
            type="text"
            size="sm"
            value={editedURL}
            onKeyDown={handleURLInputKeydown}
            onChange={(e) => setEditedURL(e.currentTarget.value)}
          />
          <InputGroup.Text
            as={Button}
            className="btn-sm"
            onClick={() => gotoURL(editedURL)}
          >
            <span
              className="fs-6 material-symbols-outlined"
              style={{ lineHeight: "inherit" }}
            >
              arrow_right_alt
            </span>
          </InputGroup.Text>
        </InputGroup>
      </Container>
    </Navbar>
  );
}

export default WebBrowserToolbar;
