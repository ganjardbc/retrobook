import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'
import globals from 'globals'
import vueParser from 'vue-eslint-parser'

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', 'docs/**', '**/coverage/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: { parser: vueParser, parserOptions: { parser: tseslint.parser } },
  },
  {
    files: ['apps/web/**/*.{ts,vue}', 'apps/admin/**/*.{ts,vue}'],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['apps/api/**/*.ts', 'packages/**/*.ts', '**/*.mjs'],
    languageOptions: { globals: globals.node },
  },
  // Awalan underscore menandai variabel atau argumen yang sengaja tidak dipakai.
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
    },
  },
  // CLAUDE.md: jangan pakai v-html untuk konten pengguna.
  { files: ['**/*.vue'], rules: { 'vue/no-v-html': 'error' } },
  // Nama komponen mengikuti docs/06-ui-ux-spec.md bagian 4 (Button, Avatar, Modal, ...).
  { files: ['**/*.vue'], rules: { 'vue/multi-word-component-names': 'off' } },
  // Prettier yang mengatur format; aturan gaya Vue dimatikan.
  {
    files: ['**/*.vue'],
    rules: {
      'vue/max-attributes-per-line': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/html-self-closing': 'off',
      'vue/html-indent': 'off',
      'vue/html-closing-bracket-newline': 'off',
      'vue/multiline-html-element-content-newline': 'off',
    },
  },
)
