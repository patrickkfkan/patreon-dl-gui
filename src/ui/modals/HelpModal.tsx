import { useCallback, useEffect, useState } from "react";
import { Modal } from "react-bootstrap";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

function LinkRenderer(
  props: React.DetailedHTMLProps<
    React.AnchorHTMLAttributes<HTMLAnchorElement>,
    HTMLAnchorElement
  >
) {
  return (
    <a href={props.href} target="_blank" rel="noreferrer">
      {props.children}
    </a>
  );
}

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

  const endHelp = useCallback(() => {
    window.mainAPI.emitMainEvent("endHelp");
    setShow(false);
  }, []);

  if (!contents) {
    return null;
  }

  return (
    <>
      <Modal show={show} onHide={endHelp} scrollable={true} size="xl" centered>
        <Modal.Body className="p-3 flex-grow-1 overflow-auto bg-dark help-modal-body">
          <Markdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
            components={{ a: LinkRenderer }}
          >
            {contents}
          </Markdown>
        </Modal.Body>
      </Modal>
    </>
  );
}

export default HelpModal;
