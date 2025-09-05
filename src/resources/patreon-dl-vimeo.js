#!/usr/bin/env node

/**
 * Taken from patreon-dl:
 * https://github.com/patrickkfkan/patreon-dl/blob/master/bin/patreon-dl-vimeo.js
 *
 * Converted to CommonJS so it can be packaged as single executable application
 * in `npm run prepare`.
 */
const parseArgs = require("yargs-parser");
const spawn = require("@patrickkfkan/cross-spawn");
const path = require("path");

function tryGetPlayerURL(html) {
  if (!html) {
    return null;
  }

  const regex = /https:\/\/player\.vimeo\.com\/video\/\d+/g;
  const match = regex.exec(html);
  if (match && match[0]) {
    console.log("Found Vimeo player URL from embed HTML:", match[0]);
    return match[0];
  }

  const regex2 = /src="(\/\/cdn.embedly.com\/widgets.+?)"/g;
  const match2 = regex2.exec(html);
  if (match2 && match2[1]) {
    const embedlyURL = match2[1];
    console.log("Found Embedly URL from embed HTML:", embedlyURL);
    let embedlySrc;
    try {
      const urlObj = new URL(`https:${embedlyURL}`);
      embedlySrc = urlObj.searchParams.get("src");
    } catch (error) {
      console.error("Error parsing Embedly URL:", error);
    }
    try {
      const embedlySrcObj = new URL(embedlySrc);
      if (embedlySrcObj.hostname === "player.vimeo.com") {
        console.log(`Got Vimeo player URL from Embedly src: ${embedlySrc}`);
      } else {
        console.warn(
          `Embedly src "${embedlySrc}" does not correspond to Vimeo player URL`
        );
      }
      return embedlySrc;
    } catch (error) {
      console.error(`Error parsing Embedly src "${embedlySrc}":`, error);
    }
  }

  return null;
}

function getCommandString(cmd, args) {
  const quotedArgs = args.map((arg) => (arg.includes(" ") ? `"${arg}"` : arg));
  return [cmd, ...quotedArgs].join(" ");
}

async function download(url, o, videoPassword, ytdlpPath, ytdlpArgs) {
  let proc;
  const ytdlp = ytdlpPath || "yt-dlp";
  const parsedYtdlpArgs = parseArgs(ytdlpArgs);
  try {
    return await new Promise((resolve, reject) => {
      let settled = false;
      const args = [];
      if (!parsedYtdlpArgs["o"] && !parsedYtdlpArgs["output"]) {
        args.push("-o", o);
      }
      if (!parsedYtdlpArgs["referrer"]) {
        args.push("--referer", "https://patreon.com/");
      }
      args.push(...ytdlpArgs);
      const printArgs = [...args];
      if (videoPassword && !parsedYtdlpArgs["video-password"]) {
        args.push("--video-password", videoPassword);
        printArgs.push("--video-password", "******");
      }
      args.push(url);
      printArgs.push(url);

      console.log(`Command: ${getCommandString(ytdlp, printArgs)}`);
      proc = spawn(ytdlp, args);

      proc.stdout?.on("data", (data) => {
        console.log(data.toString());
      });

      proc.stderr?.on("data", (data_1) => {
        console.error(data_1.toString());
      });

      proc.on("error", (err) => {
        if (settled) {
          return;
        }
        settled = true;
        reject(err);
      });

      proc.on("exit", (code) => {
        if (settled) {
          return;
        }
        settled = true;
        resolve(code);
      });
    });
  } finally {
    if (proc) {
      proc.removeAllListeners();
      proc.stdout?.removeAllListeners();
      proc.stderr?.removeAllListeners();
    }
  }
}

const args = parseArgs(process.argv.slice(2));
const {
  o: _o,
  "embed-html": _embedHTML,
  "embed-url": _embedURL,
  "video-password": videoPassword,
  "yt-dlp": _ytdlpPath
} = args;
const o = _o?.trim() ? path.resolve(_o.trim()) : null;
const embedHTML = _embedHTML?.trim();
const embedURL = _embedURL?.trim();
const ytdlpPath = _ytdlpPath?.trim() ? path.resolve(_ytdlpPath.trim()) : null;
const ytdlpArgs = args["_"];

if (!o) {
  console.error("No output file specified");
  process.exit(1);
}

if (!embedHTML && !embedURL) {
  console.error("No embed HTML or URL provided");
  process.exit(1);
}

const url = tryGetPlayerURL(embedHTML) || embedURL;

if (!url) {
  console.error(`Failed to obtain video URL`);
  process.exit(1);
}

async function doDownload(_url) {
  let code = await download(_url, o, videoPassword, ytdlpPath, ytdlpArgs);
  if (code !== 0 && _url !== embedURL && embedURL) {
    console.log(`Download failed - retrying with embed URL "${embedURL}"`);
    return await doDownload(embedURL);
  }
  return code;
}

console.log(`Going to download video from "${url}"`);

doDownload(url).then((code) => {
  process.exit(code);
});
