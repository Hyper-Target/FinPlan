import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// npm run dev   -> http://localhost:5173
// npm run build -> dist/  (base './' para que funcione en GitHub Pages y en cualquier carpeta)
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: 5173, fs: { allow: ['..'] } },
});
