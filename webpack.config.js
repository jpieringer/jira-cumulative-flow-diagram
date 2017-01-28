var webpack = require('webpack');
var CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'bundle.js',
    path: './public'
  },
  resolve: {
    extensions: ['', '.js', '.jsx', '.json']
  },
  module: {
    loaders: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        loader: 'babel-loader'
      },
      {
        test: /\.css$/,
        loaders: ['style-loader', 'css-loader']
      },
      {
        test: /\.woff2?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
        loader: 'url-loader?limit=10000',
      },
      {
        test: /\.(ttf|eot|svg)(\?[\s\S]+)?$/,
        loader: 'file-loader',
      },
      {
        test: /bootstrap-sass\/assets\/javascripts\//,
        loader: 'imports-loader?jQuery=jquery'
      },
    ]
  },
  plugins: [
    new webpack.ProvidePlugin({
      $: "jquery",
      jQuery: "jquery"
    }),
    new CopyWebpackPlugin([
      { from: 'src/manifest.json' },
      { from: 'src/index.html' },
      { from: 'src/background.js' },
      { from: 'src/icon16.png' },
      { from: 'src/icon32.png' },
      { from: 'src/icon64.png' },
      { from: 'src/icon128.png' },
      { from: 'src/icon512.png' },
    ])
  ]
}

