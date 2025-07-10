import { Button, Form, InputGroup, Navbar, Stack } from "react-bootstrap";
import { useCommands } from "../contexts/CommandsProvider";
import type { KeyboardEvent } from "react";
import { useEffect, useRef, useState } from "react";
import ToolbarButton from "../../../common/ui/components/ToolbarButton";
import type { WebBrowserPageNavigatedInfo } from "../../types/MainEvents";

function WebBrowserToolbar() {
  const urlInputRef = useRef<HTMLInputElement>(null);
  const [pageInfo, setPageInfo] = useState<WebBrowserPageNavigatedInfo | null>(
    null
  );
  const [editedURL, setEditedURL] = useState("");
  const { gotoURL, gotoHome, goBack, goForward, editSettings } = useCommands().webBrowser;

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
      <Stack direction="horizontal" className="w-100 ps-2" gap={1}>
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
          icon="refresh"
          iconClassName="fs-5"
          className="nav"
          tooltip="Reload page"
          onClick={reload}
        />
        <ToolbarButton
          icon="home"
          iconClassName="fs-5"
          className="nav"
          tooltip="Go to Patreon homepage"
          onClick={gotoHome}
        />
        <InputGroup className="flex-fill">
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
        <ToolbarButton
          icon="settings"
          className="nav ms-2"
          iconClassName="fs-5"
          tooltip="Settings"
          onClick={editSettings}
        />
      </Stack>
    </Navbar>
  );
}

export default WebBrowserToolbar;
