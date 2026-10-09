import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      'socket.io-client': resolve(__dirname, 'frontend/node_modules/socket.io-client')
    }
  },
  test: {
    setupFiles: './vitest.setup.js'
  }
});
