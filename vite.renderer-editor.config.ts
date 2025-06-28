import { ConfigEnv, defineConfig } from "vite";
import path from "path";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig((env) => {
  const forgeEnv = env as ConfigEnv<"renderer">;
  return {
    root: path.resolve(__dirname, "src/main/views/editor"),
    plugins: [react()],
    build: {
      outDir: path.resolve(__dirname, `.vite/renderer/${forgeEnv.forgeConfigSelf.name}`)
    }
  };
});
