import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
      rollupTypes: true,
    })
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'FaceNetJS',
      formats: ['es'],
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
    minify: false
  }
}); 