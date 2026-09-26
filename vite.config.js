import { defineConfig } from 'vite';

// Keep client requests relative in every environment. During development Vite
// owns port 5173 while the API service owns port 3001, so proxy only API calls.
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
    },
  },
});
