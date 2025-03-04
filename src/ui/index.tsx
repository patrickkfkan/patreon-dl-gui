import App from "./App";
import { createRoot } from "react-dom/client";

export function loadUI() {
  const root = createRoot(document.body);
  root.render(<App />);
}
