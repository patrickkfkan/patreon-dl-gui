import App from "./App";
import { createRoot } from "react-dom/client";
import Bootstrap from "./Bootstrap";

export function loadMainUI() {
  const root = createRoot(document.body);
  root.render(<App />);
}

export function loadBootstrapUI() {
  const root = createRoot(document.body);
  root.render(<Bootstrap />);
}
