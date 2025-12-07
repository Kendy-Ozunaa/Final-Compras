import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/',  // <-- ESTA LÍNEA ES CLAVE PARA PRODUCCIÓN
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
