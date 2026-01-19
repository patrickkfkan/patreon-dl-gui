import path from "path";
import { fileURLToPath } from "url";
import { builtinModules } from "module";
import { ConfigEnv, defineConfig, normalizePath } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mainAssetsSrcPath = path.resolve(__dirname, "src/main/assets");

export default defineConfig((env) => {
  const forgeEnv = env as ConfigEnv<"build">;
  return {
    plugins: [
      viteStaticCopy({
        targets: [
          {
            src: normalizePath(path.resolve(mainAssetsSrcPath, "help/**/*.md")),
            dest: "assets/main",
            // Don't use "structured: true" as it creates directories for the *full* path of src.
            rename: (_filename, _ext, fullPath) =>
              path.relative(mainAssetsSrcPath, fullPath)
          }
        ]
      })
    ],
    build: {
      lib: {
        entry: forgeEnv.forgeConfigSelf.entry,
        formats: ["es"],
        fileName: () => "[name].js"
      },
      target: "esnext",
      rollupOptions: {
        // Vite generates CJS code for these modules so they need to be externalized.
        external: [
          "bufferutil",
          "utf-8-validate",
          "undici", // ^6.21.3
          "patreon-dl", // ^3.6.0

          ...builtinModules,
          ...builtinModules.map(m => `node:${m}`)
        ]
      }
    }
  };
});
