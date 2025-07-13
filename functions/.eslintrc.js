module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
    jest: true,
  },
  extends: [],
  rules: {
    // Disable all rules
    "no-unused-vars": "off",
    "no-undef": "off",
    "no-console": "off",
    "no-prototype-builtins": "off",
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
  },
};
