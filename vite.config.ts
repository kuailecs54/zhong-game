import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    host: true, // 监听 0.0.0.0，允许局域网访问
    port: 5173,
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          vue: ['vue', 'vue-router', 'pinia'],
        },
      },
    },
  },
  test: {
    // jsdom 需额外依赖 jsdom；当前最小侵入不新增依赖，loader/shelfLayout 单测无需 DOM，故用 node 环境
    // 若后续需 DOM 单测，安装 jsdom 后改为 environment:'jsdom' 即可（约束：不引入新依赖）
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,vue}'],
      thresholds: { lines: 50 },
    },
  },
})
