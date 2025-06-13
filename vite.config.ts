import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
      rollupTypes: false,
    })
  ],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        'react/index': resolve(__dirname, 'src/react/index.ts')
      },
      name: 'FaceNetJS',
      formats: ['es'],
      fileName: (format, entryName) => {
        const extension = format === 'es' ? 'js' : 'cjs';
        return `${entryName}.${extension}`;
      }
    },
    rollupOptions: {
      external: ['@mediapipe/tasks-vision', '@tensorflow/tfjs', 'react'],
      output: {
        globals: {
          '@mediapipe/tasks-vision': 'MediaPipeTasksVision',
          '@tensorflow/tfjs': 'tf',
          'react': 'React'
        }
      }
    },
    sourcemap: true,
    minify: false
  }
}); 