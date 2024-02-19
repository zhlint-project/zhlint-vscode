// eslint.config.js
const antfu = require('@antfu/eslint-config').default

module.exports = antfu({
  rules: {
    'style/indent': 'off',
    'style/no-tabs': 'off',
    'node/prefer-global/process': 'off',
  },
  markdown: false,
  files: [
    '.gitignore',
    '.eslintignore',
  ],
})
