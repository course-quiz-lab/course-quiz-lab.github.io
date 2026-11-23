import ui from '@nuxt/ui/vite';
import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';
import prefetchPlugin from 'vite-plugin-bundle-prefetch';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    prefetchPlugin(),
    ui({
      // 纯 Vue 集成：注册 Nuxt UI 语义色，使 bg-primary / text-muted /
      // border-default 等工具类可用；具体主色值由运行时的 appConfig 决定。
      theme: {
        colors: [
          'primary',
          'secondary',
          'success',
          'info',
          'warning',
          'error',
        ],
      },
      // Nuxt UI 的浮层（popover/tooltip/modal 等）默认不设 z-index，
      // 会被页面上带正 z-index 的吸顶元素（导航栏 z-50、答题工具条 z-30）
      // 盖住而无法点击，这里统一把浮层抬到最上层。
      ui: {
        popover: { slots: { content: 'z-50' } },
        tooltip: { slots: { content: 'z-50' } },
        modal: { slots: { overlay: 'z-50', content: 'z-50' } },
        slideover: { slots: { overlay: 'z-50', content: 'z-50' } },
        drawer: { slots: { overlay: 'z-50', content: 'z-50' } },
      },
    }),
  ],
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
