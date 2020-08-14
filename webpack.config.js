const webpack = require('webpack');
const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  mode: 'production',
  performance: {
    hints: false,
  },
  devtool: 'cheap-source-map',
  entry: [
    path.resolve(__dirname, 'app/main.tsx'),
    path.resolve(__dirname, 'app/stylesheets/main.scss'),
  ],
  output: {
    path: path.resolve(__dirname, 'dist'),
    publicPath: '/',
    filename: './dist.js',
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        include: path.resolve(__dirname, 'app'),
        loader: 'style-loader!css-loader',
      },
      {
        test: /\.scss$/,
        exclude: /node_modules/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
            options: {
              publicPath: '../',
            },
          },
          'css-loader',
          {
            loader: 'sass-loader',
            query: {
              sourceMap: false,
            },
          },
        ],
      },
      {
        test: /\.ts(x?)$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader',
          }, 
        ],
      },
      // All output '.js' files will have any sourcemaps re-processed by 'source-map-loader'.
      {
        enforce: 'pre',
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'source-map-loader',
      },
    ]
  },
  resolve: {
    modules: ['node_modules', path.resolve(__dirname, 'app')],
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.css', '.scss'],
    alias: {
      highlightjs_css: path.join(__dirname, 'node_modules/highlight.js/styles/atom-one-light.css'),
      stylekit: path.join(__dirname, 'node_modules/sn-stylekit/dist/stylekit.css'),
    },
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: './dist.css',
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: './app/index.html',
          to: 'index.html',
        }, 
      ],
    }),
  ],
};
