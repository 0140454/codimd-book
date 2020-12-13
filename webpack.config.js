const CopyWebpackPlugin = require('copy-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')

module.exports = {
  name: 'build',
  entry: {
    book: [
      './js/book.js',
      './scss/book.scss'
    ],
    background: [
      './js/background.js'
    ]
  },
  output: {
    filename: 'js/[name].js'
  },
  module: {
    rules: [
      {
        test: /\.scss$/i,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
          'sass-loader'
        ]
      }
    ]
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: './css/[name].css'
    }),
    new CopyWebpackPlugin({
      patterns: [
        'manifest.json',
        'icon.png'
      ]
    })
  ],
  mode: 'none'
}
