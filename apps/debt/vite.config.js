import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/app/debt/',
  build: {
    outDir: '../../frontend/app/debt',
    emptyOutDir: true,
  },
});
