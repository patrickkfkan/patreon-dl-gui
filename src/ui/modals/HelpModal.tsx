import { useCallback, useEffect, useState } from "react";
import { Modal } from "react-bootstrap";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

function HelpModal() {
  const [contents, setContents] = useState<string | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const removeListenerCallbacks = [
      window.mainAPI.on("requestHelpResult", (result) => {
        setContents(result.contents);
        setShow(true);
      })
    ];

    return () => {
      removeListenerCallbacks.forEach((cb) => cb());
    };
  }, []);

  const openExternalBrowser = useCallback((url?: string) => {
    if (url) {
      window.mainAPI.emitMainEvent("openExternalBrowser", url);
    }
  }, []);

  const renderLink = useCallback(
    (
      props: React.DetailedHTMLProps<
        React.AnchorHTMLAttributes<HTMLAnchorElement>,
        HTMLAnchorElement
      >
    ) => {
      return (
        <a
          href="#"
          target="_blank"
          rel="noreferrer"
          onClick={(e) => {
            e.preventDefault();
            openExternalBrowser(props.href);
          }}
        >
          {props.children}
        </a>
      );
    },
    [openExternalBrowser]
  );

  const hide = useCallback(() => {
    setShow(false);
  }, []);

  const end = useCallback(() => {
    window.mainAPI.emitMainEvent("endHelp");
  }, []);

  if (!contents) {
    return null;
  }

  return (
    <>
      <Modal
        show={show}
        onHide={hide}
        onExited={end}
        scrollable={true}
        size="xl"
        centered
      >
        <Modal.Body className="p-3 flex-grow-1 overflow-auto bg-dark help-modal-body">
          <Markdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
            components={{ a: renderLink }}
          >
            {contents}
          </Markdown>
        </Modal.Body>
      </Modal>
    </>
  );
}

export default HelpModal;
