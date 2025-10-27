import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, readdirSync, existsSync, readFileSync, writeFileSync } from 'fs';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    {
      name: 'copy-manifest-and-icons',
      closeBundle() {
        // Copy manifest.json to dist
        copyFileSync('manifest.json', 'dist/manifest.json');
        
        // Move index.html from dist/src/panel to dist and fix paths
        if (existsSync('dist/src/panel/index.html')) {
          let html = readFileSync('dist/src/panel/index.html', 'utf-8');
          // Fix relative paths: ../../panel.js -> ./panel.js
          html = html.replace(/src="\.\.\/\.\.\//g, 'src="./');
          html = html.replace(/href="\.\.\/\.\.\//g, 'href="./');
          writeFileSync('dist/index.html', html);
        }
        
        // Copy icons folder to dist
        const iconsDir = 'icons';
        const distIconsDir = 'dist/icons';
        
        if (!existsSync(distIconsDir)) {
          mkdirSync(distIconsDir, { recursive: true });
        }
        
        if (existsSync(iconsDir)) {
          const files = readdirSync(iconsDir);
          files.forEach(file => {
            if (file.endsWith('.png')) {
              copyFileSync(`${iconsDir}/${file}`, `${distIconsDir}/${file}`);
            }
          });
        }
      },
    },
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'src/panel/index.html'),
        background: resolve(__dirname, 'src/background/background.ts'),
        content: resolve(__dirname, 'src/content/contentScript.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          // Place files in their respective directories
          if (chunkInfo.name === 'background') {
            return 'background.js';
          }
          if (chunkInfo.name === 'content') {
            return 'content.js';
          }
          if (chunkInfo.name === 'index') {
            return 'panel.js';
          }
          return '[name].js';
        },
        chunkFileNames: 'chunks/[name].[hash].js',
        assetFileNames: (assetInfo) => {
          // Keep panel assets in same directory
          if (assetInfo.name?.endsWith('.css')) {
            return '[name][extname]';
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
