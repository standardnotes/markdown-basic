const webpack = require('webpack');
const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  mode: 'production',
  devtool: 'source-map',
  entry: [
    path.resolve(__dirname, 'app/main.tsx'),
    path.resolve(__dirname, 'app/stylesheets/main.scss'),
  ],
  output: {
    path: path.resolve(__dirname, 'dist'),
    publicPath: '/',
    filename: './dist.js'
  },
  module: {
    rules: [
      {
        test: /\.s?css$/,
        include: path.resolve(__dirname, 'app'),
        loader: [MiniCssExtractPlugin.loader, 'css-loader', 'sass-loader']
      },
      {
        test: /\.ts(x?)$/,
        exclude: /node_modules/,
        use: [
            {
                loader: "ts-loader"
            }
        ]
      },
        // All output '.js' files will have any sourcemaps re-processed by 'source-map-loader'.
      {
        enforce: "pre",
        test: /\.js$/,
        exclude: /node_modules/, 
        loader: "source-map-loader"
      },
    ]
  },
  externals: {
    'filesafe-js': 'filesafe-js',
    "react": "React",
    "react-dom": "ReactDOM",
  },
  resolve: {
    modules: [
      "node_modules",
      path.resolve(__dirname, "app")
    ],
    extensions: ['.ts','.tsx','.js', '.jsx', '.css', '.scss'],
    alias: {
        highlightjs_css: path.join(__dirname, 'node_modules/highlight.js/styles/atom-one-light.css'),
        stylekit: path.join(__dirname, 'node_modules/sn-stylekit/dist/stylekit.css')
    }
  },
  plugins: [
    new MiniCssExtractPlugin(
      {
        // Options similar to the same options in webpackOptions.output
        // both options are optional
        filename: 'dist.css',
      }
    ),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('production')
    }),
    new CopyWebpackPlugin({
       patterns: [
         {from: './app/index.html', to: 'index.html'}, 
         {from: path.resolve(__dirname, './node_modules/react/umd'), to: 'react/umd'},
         {from: path.resolve(__dirname, './node_modules/react-dom/umd'), to: 'react-dom/umd'},
         {from: path.resolve(__dirname, './node_modules/katex/dist'), to: 'katex'},
        ]})
  ]
};
