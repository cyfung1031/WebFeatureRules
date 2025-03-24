import { defineConfig } from 'vite';
import { resolve } from 'path';

// AMD-specific configuration
export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.js'),
      name: 'WfrParser',
      fileName: 'wfr-parser.amd',
      formats: ['amd'],
    },
    outDir: 'dist/amd',
    emptyOutDir: false,
    sourcemap: true,
    minify: 'esbuild',
    // Custom name handling for AMD
    rollupOptions: {
      output: {
        banner: `
          // AMD module with support for custom naming
          // Usage: data-global-name attribute or URL query parameter globalName=CustomName
        `,
        amd: {
          id: 'wfr-parser'
        }
      }
    }
  },
});