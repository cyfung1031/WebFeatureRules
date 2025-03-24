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
      output: {
        // Custom UMD name depending on query parameters or hash
        banner: `
          if (typeof window !== 'undefined') {
            const script = document.currentScript;
            if (script) {
              const url = new URL(script.src);
              const customName = url.searchParams.get('globalName') || url.hash.substring(1);
              if (customName) {
                window.WfrSyntaxGlobalName = customName;
              }
            }
          }
        `,
        footer: `
          if (typeof window !== 'undefined' && window.WfrSyntaxGlobalName) {
            window[window.WfrSyntaxGlobalName] = window.WfrSyntax;
            delete window.WfrSyntaxGlobalName;
          }
        `,
      },
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