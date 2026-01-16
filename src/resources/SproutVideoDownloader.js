const EmbedlyDownloader = require('./EmbedlyDownloader');

class SproutVideoDownloader extends EmbedlyDownloader {
  constructor() {
    super('SproutVideo', 'videos.sproutvideo.com');
  }
}

module.exports = SproutVideoDownloader;