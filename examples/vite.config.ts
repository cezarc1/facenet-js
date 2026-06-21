import tailwindcss from '@tailwindcss/vite';
import babel from '@rolldown/plugin-babel';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/facenet-js/',
  plugins: [
    react(),
    babel({
      presets: [reactCompilerPreset()],
    }),
    tailwindcss(),
  ],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
});
