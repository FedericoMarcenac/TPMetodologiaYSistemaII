import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // 0.0.0.0 y no localhost: dentro del contenedor, "localhost" significa
    // el propio contenedor, y el navegador no lo alcanzaria desde afuera.
    host: '0.0.0.0',
    port: 5173,
    watch: {
      // Necesario para que el hot reload funcione con archivos montados
      // desde Mac o Windows: los eventos del sistema de archivos no
      // cruzan bien el bind mount, asi que Vite pregunta cada tanto.
      usePolling: true,
    },
  },
});
