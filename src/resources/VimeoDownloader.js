const EmbedlyDownloader = require("./EmbedlyDownloader");
const entities = require('entities');

class VimeoDownloader extends EmbedlyDownloader {
  constructor() {
    super("Vimeo", "player.vimeo.com");
  }

  // Override
  getPlayerURL(html) {
    if (html) {
      const regex = /src=\"(https:\/\/player\.vimeo\.com\/video\/\d+(?:\?.+?)?)\"/g;
      const match = regex.exec(html);
      if (match && match[1]) {
        const url = entities.decodeHTML(match[1]);
        console.log("Found Vimeo player URL from embed HTML:", url);
        return url;
      }
      console.warn("Vimeo player URL not found in embed HTML");
    }
    return super.getPlayerURL(html);
  }
}

module.exports = VimeoDownloader;
