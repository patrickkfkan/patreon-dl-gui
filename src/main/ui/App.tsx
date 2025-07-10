import EditorPanel from "./editor/EditorPanel";
import { EditorContextProvider } from "./contexts/EditorContextProvider";
import EditorToolbar from "./editor/EditorToolbar";
import { ConfigProvider } from "./contexts/ConfigProvider";
import "bootswatch/dist/darkly/bootstrap.min.css";
import "material-icons/iconfont/material-icons.css";
import "material-symbols";
import "./styles/main.css";
import "../../common/ui/styles/components.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { CommandsProvider } from "./contexts/CommandsProvider";
import WebBrowserToolbar from "./editor/WebBrowserToolbar";
import CustomScrollbars from "../../common/ui/components/CustomScrollbars";
import { ToastContainer } from "react-toastify";

function App() {
  const [uiReady, setUIReady] = useState(false);
  const [editorPanelWidth, setEditorPanelWidth] = useState<number | null>(null);
  const editorPanelRef = useRef<HTMLDivElement>(null);
  const webBrowserViewRef = useRef<HTMLDivElement>(null);
  const dividerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const width = await window.mainAPI.invoke("getEditorPanelWidth");
      setEditorPanelWidth(width);
      setUIReady(true);
    })();
  }, []);

  const sendViewBounds = useCallback(() => {
    const __getBounds = (el: HTMLElement) => {
      const {
        offsetLeft: x,
        offsetTop: y,
        clientWidth: width,
        clientHeight: height
      } = el;
      return {
        x,
        y,
        width,
        height
      };
    };
    if (webBrowserViewRef.current && editorPanelRef.current) {
      window.mainAPI.emitMainEvent("viewBoundsChange", {
        editorView: __getBounds(editorPanelRef.current),
        webBrowserView: __getBounds(webBrowserViewRef.current)
      });
    }
  }, []);

  useEffect(() => {
    let resetDrag: (() => void) | null = null;
    if (dividerRef.current) {
      dividerRef.current.addEventListener("mousedown", (e) => {
        if (editorPanelRef.current) {
          const dragStartPosition = {
            x: e.pageX,
            y: e.pageY,
            editorPanelWidth: editorPanelRef.current.clientWidth
          };
          const mouseMoveListener = (e: MouseEvent) => {
            const deltaX = e.pageX - dragStartPosition.x;
            const newEditorViewWidth =
              dragStartPosition.editorPanelWidth + deltaX;
            setEditorPanelWidth(newEditorViewWidth);
          };
          const _resetDrag = (resetDrag = () => {
            document.removeEventListener("mousemove", mouseMoveListener);
            document.removeEventListener("mouseup", mouseUpListener);
            document.body.style.userSelect = "inherit";
          });
          const mouseUpListener = () => {
            _resetDrag();
            resetDrag = null;
          };
          document.addEventListener("mouseup", mouseUpListener);
          document.addEventListener("mousemove", mouseMoveListener);
          document.body.style.userSelect = "none";
        }
      });
    }
    return () => {
      if (resetDrag) {
        resetDrag();
      }
    };
  }, [uiReady]);

  useEffect(() => {
    if (webBrowserViewRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry) {
          sendViewBounds();
        }
      });
      resizeObserver.observe(webBrowserViewRef.current);

      return () => {
        resizeObserver.disconnect();
      };
    }
  }, [uiReady, sendViewBounds]);

  useEffect(() => {
    if (uiReady) {
      sendViewBounds();
      window.mainAPI.emitMainEvent("uiReady");
    }
  }, [uiReady]);

  if (!uiReady) {
    return null;
  }

  return (
    <EditorContextProvider>
      <CommandsProvider>
        <div className="d-flex vw-100">
          <div
            ref={editorPanelRef}
            className="d-flex flex-column vh-100"
            style={{ width: `${editorPanelWidth}px` }}
          >
            <EditorToolbar />
            <CustomScrollbars>
              <div className="flex-fill px-2 py-3">
                <ConfigProvider>
                  <EditorPanel />
                </ConfigProvider>
              </div>
            </CustomScrollbars>
          </div>
          <div
            ref={dividerRef}
            style={{ width: "6px" }}
            className="d-flex flex-column split-pane-divider"
          >
            <div
              style={{ height: "3rem", width: "4px" }}
              className="bg-primary"
            ></div>
            <div className="flex-grow-1 d-flex justify-content-center">
              <div style={{ width: "2px" }} className="bg-secondary"></div>
            </div>
          </div>
          <div className="flex-grow-1 d-flex flex-column vh-100">
            <WebBrowserToolbar />
            <div ref={webBrowserViewRef} className="flex-grow-1"></div>
          </div>
          <ToastContainer
            style={{
              overflow: "hidden",
              left: `calc(${editorPanelWidth}px / 2)`
            }}
          />
        </div>
      </CommandsProvider>
    </EditorContextProvider>
  );
}

export default App;
