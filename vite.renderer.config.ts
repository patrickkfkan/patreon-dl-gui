import { ConfigEnv, defineConfig } from "vite";
import path from "path";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "url";

const SRC_ROOTS = {
  "editor_view": "src/main/views/editor",
  "modal_view": "src/main/views/modal",
  "server_console": "src/server-console"
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig((env) => {
  const { name: rendererName} = (env as ConfigEnv<"renderer">).forgeConfigSelf;
  const srcRoot = SRC_ROOTS[rendererName];
  if (!srcRoot) {
    throw Error(`No src root defined for renderer "${rendererName}"`);
  }
  return {
    root: path.resolve(__dirname, srcRoot),
    plugins: [react()],
    build: {
      outDir: path.resolve(__dirname, `.vite/renderer/${rendererName}`)
    }
  };
});
