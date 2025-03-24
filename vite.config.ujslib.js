import { defineConfig } from 'vite';
import { resolve } from 'path';


function customWrapPlugin() {
    return {
      name: 'custom-wrap',
      generateBundle(options, bundle) {
        // Loop through all generated chunks/files.
        for (const [fileName, chunk] of Object.entries(bundle)) {
          if (chunk.type === 'chunk') {
            // This is a simplified example. If your output is something like:
            //   var MyLib = (function(){ ... return exports; }());
            // You can use string operations or a regex to extract the returned object
            // and then output: var xxx = { ... };
            // Here we simply prepend the variable assignment for demonstration.
            chunk.code = `${chunk.code}`;
          }
        }
      }
    };
  }
  

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.js'),
      name: 'WfrSyntax',
      fileName: ()=>'wfr-syntax.ujslib.js',
      formats: ['iife'],
    },
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
        plugins: [customWrapPlugin()],
      output: {
        // Custom UMD name depending on query parameters or hash
        banner: "",
        footer: "",
      },
    },
    minify: false, // Use esbuild instead of terser
    // esbuild minify options
    target: 'es2018',
    sourcemap: false
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
});