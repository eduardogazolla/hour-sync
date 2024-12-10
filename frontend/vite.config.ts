import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist', // Diretório onde os arquivos de build serão gerados
  },
  server: {
    port: 3000, // Porta local do dev server (opcional)
  },
  base: '/', // Certifique-se de que a base seja correta (deixe '/' para Vercel)
});
