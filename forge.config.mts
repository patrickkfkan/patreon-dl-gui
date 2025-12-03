import path from 'path';
import { fileURLToPath } from 'url';
import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerWix } from '@electron-forge/maker-wix';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm, MakerRpmConfig } from '@electron-forge/maker-rpm';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
import fs from 'fs';
import { execSync } from 'child_process';
import packageJSON from './package.json' assert { type: 'json' };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isMakePhase = process.env.FORGE_PHASE === 'make';
const isPackagePhase = process.env.FORGE_PHASE === 'package';

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    extraResource: [
      path.join(__dirname, 'resources_out/bin'),
      path.join(
        __dirname,
        'src/resources/packaging/patreon-dl-gui-server-console.desktop'
      )
    ],
  },
  rebuildConfig: {},
  makers: [
    new MakerWix({
      icon: path.join(__dirname, 'assets/electron.ico'),
      shortcutFolderName: packageJSON.productName,
      beforeCreate: async (msiCreator) => {
        // Load custom Wix XML template which:
        // 1. Removes "(Machine - MSI)" from the product name
        // 2. Removes "(Machine)" from the visible product name
        // 3. Adds a shortcut for the server console
        msiCreator.wixTemplate = fs.readFileSync(path.join(__dirname, 'misc/custom-wix.xml'), 'utf8');
      }
    }),
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
        scripts: {
          post: path.join(__dirname, 'src/resources/packaging/rpm/postinstall.sh'),
          postun: path.join(__dirname, 'src/resources/packaging/rpm/postuninstall.sh')
        }
      } as MakerRpmConfig['options']
    }),
    new MakerDeb({
      options: {
        scripts: {
          postinst: path.join(__dirname, 'src/resources/packaging/deb/postinst'),
          postrm: path.join(__dirname, 'src/resources/packaging/deb/postrm')
        }
      }
    })
  ],
  plugins: [
    ...(isMakePhase || isPackagePhase ? [
      new AutoUnpackNativesPlugin({}),
      new FusesPlugin({
        version: FuseVersion.V1,
        [FuseV1Options.RunAsNode]: false,
        [FuseV1Options.EnableCookieEncryption]: true,
        [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
        [FuseV1Options.EnableNodeCliInspectArguments]: false,
        [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
        [FuseV1Options.OnlyLoadAppFromAsar]: true,
      })
    ] : []),
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
        {
          entry: 'src/server-console/server-console-preload.ts',
          config: 'vite.preload.config.ts',
          target: "preload"
        }
      ],
      renderer: [
        {
          name: "editor_view",
          config: 'vite.renderer.config.ts'
        },
        {
          name: "modal_view",
          config: 'vite.renderer.config.ts'
        },
        {
          name: "server_console",
          config: "vite.renderer.config.ts"
        }
      ]
    })
  ],
  hooks: {
    async postPackage(_config, packageResult) {
      for (const outputPath of packageResult.outputPaths) {
        // Write a minimal package.json to install externalized modules.
        // Vite generates CJS code for these modules so they cannot be bundled.
        // Place node_modules in ouputPath/resources.
        const appDir = path.join(outputPath, 'resources');
        if (!fs.existsSync(appDir)) {
          fs.mkdirSync(appDir, { recursive: true });
        }
        fs.writeFileSync(`${appDir}/package.json`, JSON.stringify({
          dependencies: {
            "undici": "^6.21.3",
            "patreon-dl": "^3.5.0"
          }
        }, null, 2));
        execSync('npm install --omit=dev', { cwd: appDir, stdio: 'inherit' });
        // Rebuild better-sqlite3 to prevent NODE_MODULE_VERSION mismatch
        execSync('npx electron-rebuild', { cwd: appDir, stdio: 'inherit' });
      }
    },
    async postMake(config, makeResults) {
      const hasWixMaker = config.makers.some(
        (maker) => maker instanceof MakerWix
      );
      if (!hasWixMaker) {
        return;
      }
      // Find the Wix output artifact and add version / arch to its filename
      for (const result of makeResults) {
        const artifacts = result.artifacts.filter(
          artifact => path.extname(artifact) === '.msi'
        );
        for (const artifact of artifacts) {
          const { dir, name, ext } = path.parse(artifact);
          const newName = path.join(
            dir,
            `${name}-${packageJSON.version}_${result.arch} Setup${ext}`
          );
          fs.renameSync(artifact, newName);
          console.info(
            `Renamed artifact: ${path.basename(artifact)} -> ${path.basename(newName)}`
          );
        }
      }
    }
  }
};

export default config;
