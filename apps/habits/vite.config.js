import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/app/habits/',
  build: {
    outDir: '../../frontend/app/habits',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      // during local dev, point API calls at `vercel dev` (port 3456)
      '/api': 'http://localhost:3456',
    },
  },
});
