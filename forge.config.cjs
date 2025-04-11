const path = require('path');
const { MakerSquirrel } = require('@electron-forge/maker-squirrel');
const { MakerZIP } = require('@electron-forge/maker-zip');
const { MakerDeb } = require('@electron-forge/maker-deb');
const { MakerRpm } = require('@electron-forge/maker-rpm');
const { AutoUnpackNativesPlugin } = require('@electron-forge/plugin-auto-unpack-natives');
const { WebpackPlugin } = require('@electron-forge/plugin-webpack');
const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');

const { mainConfig } = require('./webpack.main.config');
const { rendererConfig } = require('./webpack.renderer.config');

const config = {
  packagerConfig: {
    asar: true,
    extraResource: ['./resources_out/bin']
  },
  rebuildConfig: {},
  makers: [new MakerSquirrel({}), new MakerZIP({}, ['darwin']), new MakerRpm({
    options: {
      /**
       * Note: we override maker-rpm package with latest version, and set 
       * `specTemplate` to point to our custom spec file. The custom spec
       * disables stripping of the patreon-dl-vimeo binary, which would otherwise 
       * throw "Pkg: Error reading from file" when executed.
       */
      specTemplate: path.join(__dirname, '/misc/rpm_spec.ejs')
    }
  }), new MakerDeb({})],
  plugins: [
    new AutoUnpackNativesPlugin({}),
    new WebpackPlugin({
      mainConfig,
      renderer: {
        config: rendererConfig,
        entryPoints: [
          {
            html: './src/core/index.html',
            js: './src/core/renderer.ts',
            name: 'main_window',
            preload: {
              js: './src/core/preload.ts',
            },
          },
          {
            html: './src/core/modal/index.html',
            js: './src/core/modal/renderer.ts',
            name: 'modal_window',
            preload: {
              js: './src/core/modal/preload.ts',
            },
          }
        ],
      },               
      devContentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-eval'; font-src 'self' https://fonts.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data:;"
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
};

module.exports = config;