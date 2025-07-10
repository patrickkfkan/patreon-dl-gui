import { defineConfig } from "vite";

export default defineConfig((_env) => {
  return {
    build: {
      rollupOptions: {
        output: {
          format: "es",
          // Must output preload scripts as .mjs, otherwise electron will require() them
          entryFileNames: "[name].mjs",
          chunkFileNames: "[name].mjs",
          assetFileNames: "[name].[ext]"
        }
      }
    }
  };
});
