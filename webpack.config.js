// webpack.config.js
const path = require("path");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");

module.exports = {
  //sourceMap 原映射
  devtool: "eval",
  // 打包环境 默认是生产环境 production
  // 如果是开发环境 这里需要换成 development
  // 接下来为了观察打包后的文件，使用 development
  mode: "production",
  entry: {
    //入口文件
    app: "/src/index.ts",
  },
  output: {
    //出口文件
    publicPath: "/",
    path: path.resolve(__dirname, "dist"),
    filename: "index.js",
  },
  module: {
    rules: [
      {
        test: /\.ts?$/,
        use: "ts-loader",
        exclude: "/node-modules/",
      },
    ],
  },
  plugins: [new CleanWebpackPlugin()],
  resolve: {
    extensions: ["", ".ts", ".tsx", ".js", ".jsx"],
    alias: {
      "@": require("path").resolve(__dirname, "./src"),
    },
  },
};
