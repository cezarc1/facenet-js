import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'FaceNetJS',
      formats: ['cjs'],
      fileName: 'index'
    },
    rollupOptions: {
      external: ['@mediapipe/tasks-vision', '@tensorflow/tfjs'],
      output: {
        globals: {
          '@mediapipe/tasks-vision': 'MediaPipeTasksVision',
          '@tensorflow/tfjs': 'tf'
        }
      }
    },
    sourcemap: true,
    minify: false,
    outDir: 'dist',
    emptyOutDir: false
  }
}); 