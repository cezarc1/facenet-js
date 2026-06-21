import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './test/setup.ts',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      'facenet-js/react': resolve(__dirname, './src/react/index.ts'),
      'facenet-js': resolve(__dirname, './src/index.ts'),
      react: resolve(__dirname, './node_modules/react'),
      'react-dom': resolve(__dirname, './node_modules/react-dom'),
    },
  },
});
