// eslint.config.js
const antfu = require('@antfu/eslint-config').default

module.exports = antfu({
  rules: {
    'style/indent': 'off',
    'style/no-tabs': 'off',
    'no-console': 'off',
		'node/prefer-global/process': 'off',
  },
  markdown: false,
  ignores: [
    '.gitignore',
    '.eslintignore',
  ],
})
