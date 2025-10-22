import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, mkdirSync } from 'fs';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-manifest',
      closeBundle() {
        // Copy manifest.json to dist
        copyFileSync('manifest.json', 'dist/manifest.json');
      },
    },
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        panel: resolve(__dirname, 'src/panel/index.html'),
        background: resolve(__dirname, 'src/background/background.ts'),
        content: resolve(__dirname, 'src/content/contentScript.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          // Place files in their respective directories
          if (chunkInfo.name === 'background') {
            return 'src/background/[name].js';
          }
          if (chunkInfo.name === 'content') {
            return 'src/content/[name].js';
          }
          return 'src/[name]/[name].js';
        },
        chunkFileNames: 'chunks/[name].[hash].js',
        assetFileNames: (assetInfo) => {
          // Keep panel assets in panel directory
          if (assetInfo.name?.endsWith('.css')) {
            return 'src/panel/[name][extname]';
          }
          return 'assets/[name][extname]';
        },
      },
    },
    target: 'es2020',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // Keep console.error and console.warn
        drop_debugger: true,
      },
    },
    sourcemap: false,
    // Ensure bundle size stays under budget
    chunkSizeWarningLimit: 1000, // 1000 KB = ~1 MB
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
