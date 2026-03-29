import globals from "globals";
import eslint from "@eslint/js";
import reactPlugin from "eslint-plugin-react";
import tseslint from "typescript-eslint";
import unusedImports from "eslint-plugin-unused-imports";
import { defineConfig } from "eslint/config";

export default defineConfig(
  {
    ignores: ["src/resources/*.js"],
  },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  reactPlugin.configs.flat.recommended,
  reactPlugin.configs.flat["jsx-runtime"],
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    plugins: {
        "unused-imports": unusedImports,
    },
    rules: {
      "unused-imports/no-unused-imports": "error",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_"
        }
      ],
      "@typescript-eslint/consistent-type-imports": "error",
      "react/prop-types": "off"
    },
    settings: {
      react: {
        version: "detect"
      }
    }
  }
);
