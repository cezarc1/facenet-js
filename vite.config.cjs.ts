import { defineConfig } from 'vite';
import { resolve } from 'path';

const externalDependencies = [
  '@mediapipe/tasks-vision',
  'react',
  'react/jsx-runtime',
  'react/jsx-dev-runtime',
];

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        'react/index': resolve(__dirname, 'src/react/index.ts')
      },
      name: 'FaceNetJS',
      formats: ['cjs'],
    },
    rollupOptions: {
      external: externalDependencies,
      output: {
        globals: {
          '@mediapipe/tasks-vision': 'MediaPipeTasksVision',
          'react': 'React',
          'react/jsx-runtime': 'ReactJSXRuntime',
          'react/jsx-dev-runtime': 'ReactJSXDevRuntime'
        }
      }
    },
    sourcemap: true,
    minify: false,
    outDir: 'dist',
    emptyOutDir: false
  }
}); 
