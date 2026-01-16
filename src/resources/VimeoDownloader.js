const EmbedlyDownloader = require('./EmbedlyDownloader');

class VimeoDownloader extends EmbedlyDownloader {
  constructor() {
    super('Vimeo', 'player.vimeo.com');
  }

  // Override
  getPlayerURL(html) {
    if (html) {
      const regex = /https:\/\/player\.vimeo\.com\/video\/\d+/g;
      const match = regex.exec(html);
      if (match && match[0]) {
        console.log('Found Vimeo player URL from embed HTML:', match[0]);
        return match[0];
      }
    }
    return super.getPlayerURL(html);
  }
}

module.exports = VimeoDownloader;