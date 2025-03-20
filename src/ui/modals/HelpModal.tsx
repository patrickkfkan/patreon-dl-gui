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

  const openExternalBrowser = useCallback(async (url?: string) => {
    if (url) {
      await window.mainAPI.invoke("openExternalBrowser", url);
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
          onClick={async (e) => {
            e.preventDefault();
            await openExternalBrowser(props.href);
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

  const end = useCallback(async () => {
    await window.mainAPI.emitMainEvent("helpModalClose");
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
