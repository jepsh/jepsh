const { dts } = require("rollup-plugin-dts");

module.exports = [
  {
    input: "dist/types/index.d.ts",
    output: {
      file: "dist/index.d.ts",
      format: "es",
    },
    plugins: [dts()],
  },
  {
    input: "dist/types/dom/index.d.ts",
    output: {
      file: "dist/dom/index.d.ts",
      format: "es",
    },
    plugins: [dts()],
  },
];
