import { createRoot } from "react-dom/client";
import App from "../../main/ui/App";
import ModalWrapper from "../../main/ui/modals/ModalWrapper";
import ServerConsoleApp from "../../server-console/ui/ServerConsoleApp";

export function loadMainUI() {
  const root = createRoot(document.body);
  root.render(<App />);
}

export function loadModalWrapper() {
  const root = createRoot(document.body);
  root.render(<ModalWrapper />);
}


export function loadServerConsoleUI() {
  const root = createRoot(document.body);
  root.render(<ServerConsoleApp />);
}
