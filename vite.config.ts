import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

const externalDependencies = [
  '@mediapipe/tasks-vision',
  'react',
  'react/jsx-runtime',
  'react/jsx-dev-runtime',
];

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
    minify: false
  }
}); 
