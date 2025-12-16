// frontend/vite.config.ts - Complete fix for SPA routing in Docker
import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// ✅ Custom plugin to handle SPA routing in dev mode
const spaFallbackPlugin = (): Plugin => ({
  name: 'spa-fallback',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      // Only handle GET requests
      if (req.method !== 'GET') {
        return next();
      }

      const url = req.url || '';

      // Don't intercept API calls or static assets
      if (
        url.startsWith('/api') ||
        url.startsWith('/health') ||
        url.startsWith('/@') ||
        url.includes('.') ||
        url.startsWith('/src')
      ) {
        return next();
      }

      // For all other routes, serve index.html (SPA fallback)
      req.url = '/index.html';
      next();
    });
  }
});

export default defineConfig({
  plugins: [
    react(),
    spaFallbackPlugin()  // ✅ Add custom SPA fallback
  ],
  server: {
    host: '0.0.0.0',
    port: 3000,
    watch: {
      usePolling: true,
    },
    // Proxy API requests to backend
    proxy: {
      '/api': {
        target: 'http://backend:8000',
        changeOrigin: true,
        secure: false,
      },
      '/health': {
        target: 'http://backend:8000',
        changeOrigin: true,
        secure: false,
      }
    },
    hmr: {
      overlay: true,
      clientPort: 3000
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  define: {
    'process.env': {}
  }
})