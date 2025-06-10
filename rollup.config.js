const path = require("path");
const resolve = require("@rollup/plugin-node-resolve");
const commonjs = require("@rollup/plugin-commonjs");
const alias = require("@rollup/plugin-alias");
const terser = require("@rollup/plugin-terser");

const rootDir = path.resolve(__dirname);
const input = {
  index: "src/index.js",
  "dom/index": "src/dom/index.js",
};
const plugins = [
  resolve(),
  commonjs(),
  terser(),
  alias({
    entries: [
      {
        find: "@",
        replacement: path.resolve(rootDir, "src"),
      },
    ],
  }),
];

module.exports = [
  {
    input,
    output: {
      dir: "dist",
      format: "esm",
      entryFileNames: "[name].js",
      chunkFileNames: "shared/[name]-[hash].js",
    },
    plugins,
  },
  {
    input,
    output: {
      dir: "dist",
      format: "cjs",
      exports: "named",
      entryFileNames: "[name].cjs",
      chunkFileNames: "shared/[name]-[hash].cjs",
    },
    plugins,
  },
];
