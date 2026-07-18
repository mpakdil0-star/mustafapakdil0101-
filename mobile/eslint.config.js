const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  {
    ignores: [
      'dist/**',
      'android/**',
      'ios/**',
      'node_modules/**',
      '**/fix_images.js',
      '**/scripts/**',
    ],
  },
  ...expoConfig,
  {
    rules: {
      'react/no-unescaped-entities': 'off',
    },
  },
]);
