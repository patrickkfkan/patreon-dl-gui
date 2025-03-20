<a href='https://ko-fi.com/C0C5RGOOP' target='_blank'><img height='36' style='border:0px;height:36px;' src='https://storage.ko-fi.com/cdn/kofi2.png?v=3' border='0' alt='Buy Me a Coffee at ko-fi.com' /></a>

# patreon-dl-gui

An Electron app that provides a GUI for [patreon-dl](https://github.com/patrickkfkan/patreon-dl).

## Installation

Download and install the package suitable for your system. Linux (RPM and DEB) and Windows x64 versions are provided. If you are on a different system, you may [run or package the app from source](#running--packaging-the-app-from-source).

If you are going to download videos, you should also install [FFmpeg](https://www.ffmpeg.org/). This is required for most videos found on Patreon.

## Quick start guide

- The UI consists of two major components: the editor and an embedded web browser.
- In the embedded web browser, go to the Patreon page you want to download content from. For content that is accessible only through subscription (which you need to have), ensure you are logged in. Content that is downloadable includes:
  - Posts by a creator
  - A single post
  - Posts in a collection
  - Product purchased from a creator's shop
- When you visit a Patreon page, the app checks whether it contains content that is downloadable. Identified *targets* are shown in the Download section of the editor, along with crucial data such as *cookie* which is required to download patron-only content.
- Once a target is identified, you can configure the options to suit your needs. To get help about an option, select the "Show Help Icons" item in the Help menu.
- To begin downloading the target, click the "play" button in the toolbar. You may also save the configuration to file and open it on another occasion.

## Interoperability with `patreon-dl` CLI

`patreon-dl-gui` is a standalone app that utilizes the `patreon-dl` library to download Patreon content. On the other hand, `patreon-dl` comes with a CLI tool that has the option to read downloader options from a config file.

Generally speaking, config files saved in `patreon-dl-gui` can be passed to the `patreon-dl` CLI tool without issue. However, you should note that the config schema accepted by `patreon-dl` CLI is broader than that for `patreon-dl-gui`. This means, if you have a config file manually created for use by `patreon-dl` CLI, opening it in `patreon-dl-gui` will not necessarily import all the options therein. In particular:

- Multiple targets are not supported.
- For file logger configuration, sections other than `[logger.file.1]` are ignored. `patreon-dl-gui` only supports a single file logger configuration.

When you open a config file, the app will notify you of any omitted or unsupported options.

If you intend to create a config file in `patreon-dl-gui` for use with `patreon-dl` CLI, you should ensure that the version of `patreon-dl` used by the app matches that of the CLI:

| `patreon-dl-gui` version | `patreon-dl` version used |
|--------------------------|---------------------------|
| v1.0.0 - v2.0.0          | v2.4.1                    |

## Running / packaging the app from source

You need [Node JS](https://nodejs.org) v20.18.1 or higher.

To run in dev mode:

```
$ git clone https://github.com/patrickkfkan/patreon-dl-gui.git
$ cd patreon-dl-gui
$ npm i
$ npm run start
```

To package the app for your OS:

```
$ npm run make
```

## Technical notes

This project uses a customized version of the [proxy-chain](https://github.com/apify/proxy-chain) library to set proxy in web browser sessions. The customizations have been submitted to the `proxy-chain` repo in [PR #577](https://github.com/apify/proxy-chain/pull/577).

## Changelog

v2.0.0
- Major UI overhaul: web browser is now embedded into the main window
- Remove the need to download web browser dependency
- One-click to apply proxy settings to web browser session
- File logger is disabled by default
- Some minor bugfixes

v1.0.0
- Initial release

## License

MIT