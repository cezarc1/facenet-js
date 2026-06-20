import { defineConfig } from 'vite';
import { resolve } from 'path';

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
      external: ['@mediapipe/tasks-vision', 'react'],
      output: {
        globals: {
          '@mediapipe/tasks-vision': 'MediaPipeTasksVision',
          'react': 'React'
        }
      }
    },
    sourcemap: true,
    minify: false,
    outDir: 'dist',
    emptyOutDir: false
  }
}); 
