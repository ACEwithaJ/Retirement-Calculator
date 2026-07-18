/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    // Recharts is a large third-party charting library isolated in its own chunk;
    // 600 kB accommodates it without a spurious warning on our own code.
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Split the charting library into its own chunk to keep the app chunk small.
        manualChunks: {
          recharts: ['recharts'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
