import { defineConfig } from 'vite';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.js'),
      name: 'WfrSyntax',
      fileName: (format)=>`wfr-syntax.${format}.js`,
      formats: ['es', 'umd', 'iife'],
    },
    rollupOptions: {
    },
    minify: 'esbuild', // Use esbuild instead of terser
    // esbuild minify options
    target: 'es2018',
    sourcemap: true,
    emptyOutDir: false,
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
});