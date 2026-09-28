import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:9000',
        changeOrigin: true,
        secure: false,
      },
      // Made by the server from the catalogue
      '/sitemap.xml': 'http://localhost:9000',
      '/robots.txt': 'http://localhost:9000'
    }
  },
  build: {
    rollupOptions: {
      output: {
        // Libraries change rarely, so they get their own file that stays
        // cached across deploys (the app code changes more often). One file
        // for all of them: splitting them further made one library run
        // before React, which it depends on.
        manualChunks(id) {
          // three.js (the home page water, about 120 kB gzipped) is only
          // downloaded with that page; it does not use React
          if (id.includes('node_modules/three/')) return 'three';
          return id.includes('node_modules') ? 'vendor' : undefined;
        }
      }
    }
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{js,jsx}'],
    setupFiles: ['src/setupTests.js'],
    restoreMocks: true
  }
})
