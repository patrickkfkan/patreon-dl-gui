import path from 'path';
import { fileURLToPath } from 'url';
import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm, MakerRpmConfig } from '@electron-forge/maker-rpm';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
import fs from 'fs';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    extraResource: ['./resources_out/bin'],
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({}),
    new MakerZIP({}, ['darwin']),
    new MakerRpm({
      options: {
        /**
         * Note: we override maker-rpm package with latest version, and set 
         * `specTemplate` to point to our custom spec file. The custom spec
         * disables stripping of the patreon-dl-vimeo binary, which would otherwise 
         * throw "Pkg: Error reading from file" when executed.
         */
        specTemplate: path.join(__dirname, '/misc/rpm-spec.ejs'),
      } as MakerRpmConfig['options'],
    }),
    new MakerDeb({}),
  ],
  plugins: [
    new AutoUnpackNativesPlugin({}),
    new VitePlugin({
      build: [
        {
          entry: 'src/index.ts',
          config: 'vite.main.config.ts',
          target: "main"
        },
        {
          entry: 'src/main/views/editor/editor-view-preload.ts',
          config: 'vite.preload.config.ts',
          target: "preload"
        },
        {
          entry: 'src/main/views/modal/modal-view-preload.ts',
          config: 'vite.preload.config.ts',
          target: "preload"
        },
      ],
      renderer: [
        {
          name: "editor_view",
          config: 'vite.renderer-editor.config.ts'
        },
        {
          name: "modal_view",
          config: 'vite.renderer-modal.config.ts'
        }
      ]
    }),
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
  hooks: {
    async postPackage(_config, packageResult) {
      for (const outputPath of packageResult.outputPaths) {
        // Write a minimal package.json to install externalized modules.
        // Vite generates CJS code for these modules so they cannot be bundled.
        // Must place node_modules in ouputPath/resources, otherwise they won't
        // get included by squirrel.
        const appDir = path.join(outputPath, 'resources');
        if (!fs.existsSync(appDir)) {
          fs.mkdirSync(appDir, { recursive: true });
        }
        fs.writeFileSync(`${appDir}/package.json`, JSON.stringify({
          dependencies: {
            "undici": "^6.21.3",
            "patreon-dl": "^3.0.0"
          }
        }, null, 2));
        execSync('npm install --omit=dev', { cwd: appDir, stdio: 'inherit' });
      }
      
    }
  }
};

export default config;
