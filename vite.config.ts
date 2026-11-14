import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `SINGLE=1 vite build` emits one self-contained HTML file (used for the shareable playable link).
const single = process.env.SINGLE === '1';

export default defineConfig({
  // GitHub Pages serves the repo under /Packdraft/ until a custom domain is attached.
  base: process.env.BASE_PATH || '/',
  plugins: single ? [react(), viteSingleFile()] : [react()],
  build: { outDir: single ? 'dist-single' : 'dist' },
});
