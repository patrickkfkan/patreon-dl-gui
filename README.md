<a href='https://ko-fi.com/C0C5RGOOP' target='_blank'><img height='36' style='border:0px;height:36px;' src='https://storage.ko-fi.com/cdn/kofi2.png?v=3' border='0' alt='Buy Me a Coffee at ko-fi.com' /></a>

# patreon-dl-gui

An Electron app that provides a GUI for [patreon-dl](https://github.com/patrickkfkan/patreon-dl).

## Features

- Download posts by a creator, in a collection or single post. Includes patron-only content provided you have a subscription to access it.
- Download products purchased from a creator's shop.
- Items included in downloads:
  - videos
  - images
  - audio
  - attachments
  - embedded YouTube and Vimeo videos
- Save campaign and content info
- Extensively configurable, e.g.:
  - Download only certain types of media
  - Filter posts by tier, date published, type of media contained
  - Download through proxy server
- Access downloaded content through a web browser

## Installation

[Download](https://github.com/patrickkfkan/patreon-dl-gui/releases) and install the package suitable for your system. Linux (RPM and DEB) and Windows x64 versions are provided. If you are on a different system, you may [run or package the app from source](#running--packaging-the-app-from-source).

If you are going to download videos, you should also install [FFmpeg](https://www.ffmpeg.org/). This is required for most videos found on Patreon.

Furthermore, if you intend to download embedded Vimeo videos, you are recommended to install [yt-dlp](https://github.com/yt-dlp/yt-dlp) and use the bundled helper script. See [Downloading embedded Vimeo videos using helper script](#downloading-embedded-vimeo-videos-using-helper-script).

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

### Downloading embedded Vimeo videos using helper script

`patreon-dl-gui` provides a helper script to facilitate downloading of embedded Vimeo videos. The script uses [yt-dlp](https://github.com/yt-dlp/yt-dlp) in the process. The easiest way to set things up would be to:
1. Download a [precompiled binary](https://github.com/yt-dlp/yt-dlp?tab=readme-ov-file#release-files) of `yt-dlp` suitable for your system.
2. Then, in `patreon-dl-gui`, go to "Embeds" -> "Vimeo".
3. Select "Use helper script" for "Download method".
4. Click the folder icon for "Path to yt-dlp" and select the downloaded binary.

## Browsing downloaded content

Content downloaded by `patreon-dl-gui` v2.2.0 onwards can be accessed through a web browser. To do this, you need to configure and start a web server that serves content from the download destination directory.

In `patreon-dl-gui`, say you've downloaded content to destination directory "C:\My Patreon Downloads". You would then do the following:

- Open the `patreon-dl-gui (Server Console)` app, found in the `patreon-dl-gui` Start Menu folder on Windows or `Utilities` application menu folder on Linux (subject to your Linux distro / desktop environment).
- Click the "Add" button in the toolbar and set the server's properties as follows:
  | Property | Value |
  |------|---------|
  | Name | Anything will do |
  | Data directory | Point to "C:\My Patreon Downloads" |
  | Port | Leave as "Auto" |
- Click the "Add" button. The server is now added and you should see a new entry in the table.
- In the Action column of the added entry, click the "Start" button (play icon).
- If server starts successfully, you should see the message "Running: `URL`" in the Status column. Click the URL to open it in a web browser and begin browsing the downloaded content.
- If you have multiple destination directories, you can add a server for each of them.

## Interoperability with `patreon-dl` CLI

`patreon-dl-gui` is a standalone app that utilizes the `patreon-dl` library to download Patreon content. On the other hand, `patreon-dl` comes with a CLI tool that has the option to read downloader options from a config file.

### Config files

Generally speaking, config files saved in `patreon-dl-gui` can be passed to the `patreon-dl` CLI tool without issue, subject to the following exceptions:

- The "Connect to YouTube account" option found in `patreon-dl-gui` has no equivalent in `patreon-dl` CLI config. You would have to connect to your YouTube account separately through executing `patreon-dl --configure-youtube`.
- Like `patreon-dl-gui`, `patreon-dl` provides a helper script for downloading embedded Vimeo videos, but you would have to set it up yourself in the config (see [example](https://github.com/patrickkfkan/patreon-dl/blob/23868152f3e37711e0964a7b909d2a41eb464759/example-embed.conf)).

What about the other way round? You should note that the config schema accepted by `patreon-dl` CLI is broader than that for `patreon-dl-gui`. This means, if you have a config file manually created for use by `patreon-dl` CLI, opening it in `patreon-dl-gui` will not necessarily import all the options therein. In particular:

- Multiple targets are not supported.
- For file logger configuration, sections other than `[logger.file.1]` are ignored. `patreon-dl-gui` only supports a single file logger configuration.

When you open a config file, the app will notify you of any omitted or unsupported options.

If you intend to create a config file in `patreon-dl-gui` for use with `patreon-dl` CLI, you should also ensure that the version of `patreon-dl` used by the app matches that of the CLI. See [Version matching](#version-matching).

### Browseability of downloaded content

Through its bundled `patreon-dl-server` executable, `patreon-dl` v3.0.0 onwards can serve content downloaded by `patreon-dl-gui` v2.2.0 and higher.

Through its server console app, `patreon-dl-gui` v2.3.0 onwards can serve content downloaded by `patreon-dl` v3.0.0 and higher.

As is the case with config files, to ensure there will be no compatibility issues, you should match the `patreon-dl-gui` version with the `patreon-dl` version used by it.

### Version matching

The following table lists the version of `patreon-dl` used by each version of `patreon-dl-gui`:

| `patreon-dl-gui` version | `patreon-dl` version used |
|--------------------------|---------------------------|
| v1.0.0 - v2.0.0          | v2.4.1                    |
| v2.1.0                   | v2.4.2                    |
| v2.2.0                   | v3.0.0                    |
| v2.3.0                   | v3.1.0                    |
| v2.4.0                   | v3.2.0                    |
| v2.4.1                   | v3.2.1

## Running / packaging the app from source

You need [Node JS](https://nodejs.org) v22.12.0 or higher.

To run in dev mode:

```
$ git clone https://github.com/patrickkfkan/patreon-dl-gui.git
$ cd patreon-dl-gui
$ npm i
$ npm run start

// To start the server console
$ npm run start -- -- --server-console
```

To package the app for your OS:

```
$ npm run make
```

## Changelog

v2.4.1
- Update `patreon-dl` library to v3.2.1
  - Fix log file path sanitization returning invalid path in some cases on Windows, causing download process to fail right at the beginning.
- Fix target identification error when proxy is used ([#24](https://github.com/patrickkfkan/patreon-dl-gui/issues/24))


v2.4.0
- Update `patreon-dl` library to v3.2.0
- Fix target identification issues with "cw" ([#22](https://github.com/patrickkfkan/patreon-dl-gui/issues/22)) and custom-domain pages
- Change default output directory to `<HOME_DIR>/patreon-dl` ([@Anthonyy232](https://github.com/Anthonyy232) - [#19](https://github.com/patrickkfkan/patreon-dl-gui/issues/19))
- Add "yt-dlp args" input to Vimeo helper script options
- Fix cookies not being fetched completely

v2.3.0
- Update `patreon-dl` library to v3.1.0
- If you got hit by Cloudflare verification loop, this should now be fixed.
- Add web browser settings with:
  - option to clear session data
  - option to set a custom user agent (mainly for debugging purpose - do not use unless you know what you're doing)
- Add reload button to web browser
- On Windows, Start Menu folder should now have the correct name "patreon-dl-gui".
- Add server console for managing servers providing access to downloaded content

v2.2.0
- Update `patreon-dl` library to v3.0.0
- Bug-fixes:
  - "Browser not secure" message / disabled sign-in button for Google account sign-ins
  - Downloading from creators without vanity ([#4](https://github.com/patrickkfkan/patreon-dl-gui/issues/4))
  - "Shell not supported" error when running on macOS ([#6](https://github.com/patrickkfkan/patreon-dl-gui/issues/6))
  - "403 - Forbidden" errors when downloading Patreon-hosted videos ([#8](https://github.com/patrickkfkan/patreon-dl-gui/issues/8))
  - Values inserted through textbox insertion links not persisting ([#9](https://github.com/patrickkfkan/patreon-dl-gui/issues/9))
- Vimeo helper script: fallback to embed URL if player URL fails to download

v2.1.0
- Update `patreon-dl` library to v2.4.2 (mainly fixes YouTube download issues)
- Fix compatibility with Node JS v23 ([#2](https://github.com/patrickkfkan/patreon-dl-gui/issues/2))
- Simplify downloading embedded Vimeo videos through helper script

v2.0.0
- Major UI overhaul: web browser is now embedded into the main window
- Remove the need to download web browser dependency
- One-click to apply proxy settings to web browser session
- Add option to connect to YouTube acount for embedded YouTube videos
- File logger is disabled by default
- Bugfixes

v1.0.0
- Initial release

## License

MIT