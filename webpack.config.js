const path = require("path");

module.exports = {
  mode: "production",
  entry: ["./index.js"],
  output: {
    globalObject: `typeof self !== 'undefined' ? self : this`,
    path: path.resolve(__dirname, "dist"),
    filename: "index.js",
    library: 'ReactWebcomponent',
    libraryTarget: 'umd',
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader"
        }
      }
    ]
  },
  externals: {
    react: {
      commonjs: 'react',
      commonjs2: 'react',
      amd: 'react',
      root: 'React',
    },
    'react-dom': {
      commonjs: 'react-dom',
      commonjs2: 'react-dom',
      amd: 'react-dom',
      root: 'ReactDOM',
    },
  }
};