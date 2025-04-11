const { rules } = require('./webpack.rules');
const { plugins } = require('./webpack.plugins');
const CopyPlugin = require('copy-webpack-plugin');
const path = require('path');

/**
 * This is the main entry point for your application, it's the first file
 * that runs in the main process.
 */
const mainConfig = {
  entry: './src/index.ts',
  // Put your normal webpack config below here
  module: {
    rules,
  },
  plugins: [
    ...plugins,
    new CopyPlugin({
      patterns: [
        { from: path.join(__dirname, '/src/assets/help'), to: path.join(__dirname, '/.webpack/main/assets/help') }
      ],
    }),
  ],
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css', '.json'],
  },
};

module.exports = { mainConfig };