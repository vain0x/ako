module.exports = {
  entry: {
    "./docs/diff/deps": "./docs/diff/deps.js",
  },
  output: {
    filename: "[name].minified.js",
    path: __dirname,
  },
}
