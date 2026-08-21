import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';
import prefetchPlugin from 'vite-plugin-bundle-prefetch';

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss(), prefetchPlugin()],
  build: {
    rollupOptions: {
      output: {
        // 强制将 Vue 运行时相关模块合并为单个 chunk，
        // 避免 rolldown 将 runtime-dom 拆成独立 chunk 后与 vue.runtime 形成循环依赖
        manualChunks(id) {
          if (
            id.includes('/node_modules/.pnpm/vue@') ||
            new RegExp(
              '/node_modules/\\.pnpm/@vue\\+(runtime-dom|runtime-core|reactivity|shared)@',
            ).test(id)
          ) {
            return 'vue';
          }
        },
      },
    },
  },
});
