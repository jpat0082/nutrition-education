// eslint-disable-next-line no-undef
module.exports = {
  env: { es2022: true, node: true },
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  extends: ['eslint:recommended', 'google'],
  rules: {
    'no-restricted-globals': ['error', 'name', 'length'],
    'prefer-arrow-callback': 'error',
    quotes: ['error', 'single', { allowTemplateLiterals: true }],
    semi: ['error', 'never'],
    'object-curly-spacing': ['error', 'always'],
    indent: ['error', 2, { SwitchCase: 1 }],
    'max-len': 'off',
    'require-jsdoc': 'off',
  },
  overrides: [
    {
      files: ['index.js'],
      rules: {
        quotes: ['error', 'single', { allowTemplateLiterals: true }],
        semi: ['error', 'never'],
        'object-curly-spacing': ['error', 'always'],
        indent: ['error', 2, { SwitchCase: 1 }],
      },
    },
    {
      files: ['**/*.spec.*'],
      env: { mocha: true },
    },
  ],
}
