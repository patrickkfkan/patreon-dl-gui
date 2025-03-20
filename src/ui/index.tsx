import App from "./App";
import { createRoot } from "react-dom/client";
import ModalWrapper from "./modals/ModalWrapper";

export function loadMainUI() {
  const root = createRoot(document.body);
  root.render(<App />);
}

export function loadModalWrapper() {
  const root = createRoot(document.body);
  root.render(<ModalWrapper />);
}
