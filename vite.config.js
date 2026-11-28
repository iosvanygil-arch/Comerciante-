import { defineConfig } from 'vite';

// Relative asset paths are required by Capacitor's local WebView (Android).
export default defineConfig({
  base: './',
  build: { outDir: 'dist', emptyOutDir: true }
});
