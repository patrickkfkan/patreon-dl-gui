const EmbedlyDownloader = require("./EmbedlyDownloader");

class StreamableDownloader extends EmbedlyDownloader {
  constructor() {
    super("Streamable", "streamable.com");
  }

  // Override
  getPlayerURL(html) {
    if (html) {
      const regex = /src="(https:\/\/streamable\.com\/e\/[^"]+)"/g;
      const match = regex.exec(html);
      if (match && match[1]) {
        // Convert embed URL (streamable.com/e/<id>) to watch URL (streamable.com/<id>)
        // for yt-dlp compatibility
        const url = match[1].replace(/\/e\//, "/");
        console.log("Found Streamable player URL from embed HTML:", url);
        return url;
      }
      console.warn("Streamable player URL not found in embed HTML");
    }
    return super.getPlayerURL(html);
  }
}

module.exports = StreamableDownloader;
