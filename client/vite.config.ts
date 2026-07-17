import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'node:path';

// 開發期：API 打到 http://localhost:3000（Express）
// 正式期：build 輸出到 ../server/public，由 Express 同源 serve
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      // 開發期把 /api 與 Better Auth 的請求代理到 Express，避免 CORS 與 cookie 跨網域問題
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: resolve(__dirname, '..', 'server', 'public'),
    emptyOutDir: true,
  },
});
