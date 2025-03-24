import { defineConfig } from 'vite';
import { resolve } from 'path';

// CommonJS-specific configuration
export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.js'),
      name: 'WfrSyntax',
      fileName: 'wfr-syntax.cjs',
      formats: ['cjs'],
    },
    outDir: 'dist/cjs',
    emptyOutDir: false,
    sourcemap: true,
    minify: 'esbuild',
  },
});