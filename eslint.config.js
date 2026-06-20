import js from '@eslint/js';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import compat from 'eslint-plugin-compat';
import { importX } from 'eslint-plugin-import-x';
import jsdoc from 'eslint-plugin-jsdoc';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const tsFiles = ['**/*.{ts,tsx}'];
const sourceFiles = ['src/**/*.{ts,tsx}'];
const reactFiles = ['src/react/**/*.{ts,tsx}'];
const nodeFiles = ['*.config.ts', '*.config.cjs.ts', 'scripts/**/*.mjs'];

const reactHooksConfig = reactHooks.configs.flat['recommended-latest'];

const jsdocTypeScriptConfig = {
  ...jsdoc.configs['flat/recommended-typescript'],
  files: sourceFiles,
  rules: {
    ...jsdoc.configs['flat/recommended-typescript'].rules,
    'jsdoc/require-jsdoc': 'off',
    'jsdoc/require-param': 'off',
    'jsdoc/require-param-description': 'off',
    'jsdoc/require-returns': 'off',
    'jsdoc/require-returns-description': 'off',
  },
};

const compatConfig = {
  ...compat.configs['flat/recommended'],
  files: sourceFiles,
  settings: {
    browserslistOpts: {
      env: 'modern',
    },
  },
};

export default tseslint.config(
  {
    ignores: ['dist/**', 'examples/**', 'node_modules/**', 'coverage/**'],
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: tsFiles,
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
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
        project: './tsconfig.eslint.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    settings: {
      'import-x/resolver-next': [
        createTypeScriptImportResolver({
          project: './tsconfig.eslint.json',
        }),
      ],
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/restrict-template-expressions': 'warn',
      '@typescript-eslint/unbound-method': 'warn',
      'import-x/no-unresolved': 'error',
      'import-x/no-cycle': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
    },
  },
  {
    files: sourceFiles,
    extends: [...tseslint.configs.strictTypeChecked],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-unnecessary-condition': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/prefer-for-of': 'warn',
      '@typescript-eslint/prefer-nullish-coalescing': 'warn',
      '@typescript-eslint/restrict-template-expressions': 'warn',
      '@typescript-eslint/strict-boolean-expressions': [
        'warn',
        {
          allowNullableBoolean: true,
          allowNullableObject: true,
          allowNumber: false,
          allowString: false,
        },
      ],
      '@typescript-eslint/unbound-method': 'warn',
      '@typescript-eslint/use-unknown-in-catch-callback-variable': 'warn',
    },
  },
  {
    ...reactHooksConfig,
    files: reactFiles,
  },
  compatConfig,
  jsdocTypeScriptConfig,
  {
    files: ['test/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/only-throw-error': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/unbound-method': 'off',
    },
  },
  {
    files: nodeFiles,
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  }
);
