const path = require("path");

module.exports = {
  env: {
    node: true,
    es2021: true,
  },
  extends: ["eslint:recommended", "plugin:node/recommended", "plugin:import/recommended", "standard", "prettier"],
  parser: "@babel/eslint-parser",
  parserOptions: {
    requireConfigFile: false,
    ecmaVersion: 12,
    sourceType: "module",
  },
  plugins: ["node", "import"],
  rules: {
    semi: ["error", "always"],
    indent: ["off"],
    quotes: ["error", "double"],
    "no-unused-vars": "warn",
    "no-control-regex": "off",
    "no-process-exit": "off",
    "node/no-missing-import": "off",
    "node/no-unsupported-features/es-syntax": ["error", { ignores: ["modules", "dynamicImport", "restSpreadProperties"] }],
    "node/no-unsupported-features/node-builtins": ["error", { version: ">=14.17.0" }],
    "import/order": ["error", { "newlines-between": "always" }],
    "import/namespace": ["error", { allowComputed: true }],
  },
  settings: {
    "import/resolver": {
      alias: {
        map: [["@", path.resolve(__dirname, "src")]],
        extensions: [".js", ".json"],
      },
    },
  },
};
