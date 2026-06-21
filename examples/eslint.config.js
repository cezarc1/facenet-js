import js from '@eslint/js';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import compat from 'eslint-plugin-compat';
import { importX } from 'eslint-plugin-import-x';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const reactHooksConfig = reactHooks.configs.flat['recommended-latest'];
const tsconfigProjects = ['./tsconfig.app.json', './tsconfig.node.json'];

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      importX.flatConfigs.recommended,
      importX.flatConfigs.typescript,
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        project: tsconfigProjects,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react-refresh': reactRefresh,
    },
    settings: {
      'import-x/resolver-next': [
        createTypeScriptImportResolver({
          project: tsconfigProjects,
          noWarnOnMultipleProjects: true,
        }),
      ],
      browserslistOpts: {
        env: 'modern',
      },
    },
    rules: {
      '@typescript-eslint/await-thenable': 'warn',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'import-x/no-unresolved': 'error',
      'import-x/no-cycle': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
    },
  },
  {
    ...compat.configs['flat/recommended'],
    files: ['**/*.{ts,tsx}'],
    settings: {
      browserslistOpts: {
        env: 'modern',
      },
    },
  },
  {
    ...reactHooksConfig,
    files: ['**/*.{ts,tsx}'],
  }
);
