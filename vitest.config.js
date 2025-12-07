import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [
    {
      name: 'vitest-svelte-environment-polyfill',
      enforce: 'pre',
      configureServer(server) {
        // Vitest's Vite server may not expose environments; guard so Svelte plugin HMR setup doesn't crash.
        server.environments = server.environments || {};
      }
    },
    svelte()
  ],
  resolve: {
    // Use browser entrypoints (Svelte client runtime) when bundling tests.
    conditions: ['browser']
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/lib/__tests__/**/*.test.js']
  }
});
