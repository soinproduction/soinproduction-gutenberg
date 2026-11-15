import {defineConfig} from 'vite';
import tailwind from '@tailwindcss/vite';
import {fileURLToPath} from 'node:url';

export default defineConfig({
  base: './',
  plugins: [tailwind()],
  resolve: {dedupe: ['react', 'react-dom']},
  esbuild: {jsx: 'automatic'},
  build: {rollupOptions: {input: {
    reference: fileURLToPath(new URL('./index.html', import.meta.url)),
    pattern: fileURLToPath(new URL('./pattern.html', import.meta.url)),
    preview: fileURLToPath(new URL('./preview.html', import.meta.url)),
  }}},
});
