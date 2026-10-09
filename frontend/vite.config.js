import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      resolvers: [ElementPlusResolver()],
    }),
    Components({
      resolvers: [ElementPlusResolver()],
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    proxy: {
      '/socket.io': {
        target: 'http://127.0.0.1:50001',
        ws: true,
        changeOrigin: true
      },
      '/uploadFile': { target: 'http://127.0.0.1:50001', changeOrigin: true },
      '/getHomeDir': { target: 'http://127.0.0.1:50001', changeOrigin: true },
      '/openCachePath': { target: 'http://127.0.0.1:50001', changeOrigin: true },
      '/setCachePath': { target: 'http://127.0.0.1:50001', changeOrigin: true },
      '/getIndexInfo': { target: 'http://127.0.0.1:50001', changeOrigin: true },
      '/getIndexInfo2': { target: 'http://127.0.0.1:50001', changeOrigin: true },
      '/geneQR': { target: 'http://127.0.0.1:50001', changeOrigin: true },
      '/geneBUserQR': { target: 'http://127.0.0.1:50001', changeOrigin: true },
      '/scanLogin': { target: 'http://127.0.0.1:50001', changeOrigin: true },
      '/checkLogin': { target: 'http://127.0.0.1:50001', changeOrigin: true },
      '/files': { target: 'http://127.0.0.1:50001', changeOrigin: true },
      '/assets': { target: 'http://127.0.0.1:50001', changeOrigin: true },
    }
  }
})
