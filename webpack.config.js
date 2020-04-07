const CopyWebpackPlugin = require('copy-webpack-plugin');
const path = require('path');
const ZipPlugin = require('zip-webpack-plugin');

module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'addon')
  },
  resolve: {
    extensions: ['.js', '.json']
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: 'babel-loader'
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.woff2?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
        use: 'url-loader?limit=10000',
      },
      {
        test: /\.(ttf|eot|svg)(\?[\s\S]+)?$/,
        use: 'file-loader',
      },
      {
        test: /bootstrap-sass\/assets\/javascripts\//,
        use: 'imports-loader?jQuery=jquery'
      },
    ]
  },
  plugins: [
    new CopyWebpackPlugin([
      { from: 'src/manifest.json' },
      { from: 'src/index.html' },
      { from: 'src/background.js' },
      { from: 'src/icon16.png' },
      { from: 'src/icon32.png' },
      { from: 'src/icon64.png' },
      { from: 'src/icon128.png' },
      { from: 'src/icon512.png' },
    ]),
    new ZipPlugin({
      filename: 'addon.zip',
    })
  ]
}

