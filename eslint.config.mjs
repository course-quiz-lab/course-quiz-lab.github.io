import eslintPluginPrettier from 'eslint-plugin-prettier/recommended';
import pluginVue from 'eslint-plugin-vue';

export default [
  {
    languageOptions: {
      parserOptions: {
        parser: '@typescript-eslint/parser',
        project: 'tsconfig.json',
        sourceType: 'module',
        extraFileExtensions: ['.vue'],
      },
    },
  },
  ...pluginVue.configs['flat/recommended'],
  {
    // root: true,
    rules: {
      'vue/no-v-html': 'off',
      'vue/no-parsing-error': 'off',
      'vue/valid-template-root': 'off',
      'vue/no-multiple-template-root': 'off',
      'vue/multi-word-component-names': 'off',
    },
  },
  eslintPluginPrettier,
];