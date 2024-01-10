const CopyWebpackPlugin = require('copy-webpack-plugin');
const path = require('path');
const ZipPlugin = require('zip-webpack-plugin');

function createWebpackConfig(browser) {
  return {
   entry: './src/index.js',
   output: {
     filename: 'bundle.js',
     path: path.resolve(__dirname, 'dist', browser)
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
     new CopyWebpackPlugin({
       patterns: [
         { from: 'src/manifest-' + browser + '.json', to: 'manifest.json' },
         { from: 'src/index.html' },
         { from: 'src/background-' + browser + '.js' },
         { from: 'src/icon16.png' },
         { from: 'src/icon32.png' },
         { from: 'src/icon64.png' },
         { from: 'src/icon128.png' },
         { from: 'src/icon512.png' },
       ]
     }),
     new ZipPlugin({
       filename: browser + '-addon.zip',
     })
   ]
 };
}

module.exports = [createWebpackConfig('firefox'), createWebpackConfig('chrome')]
