import { createPinia } from 'pinia';
import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { useBankStore } from './stores/bank';

import './style.css';

async function bootstrap() {
  const app = createApp(App);
  const pinia = createPinia();
  app.use(pinia);

  const bankStore = useBankStore();
  await bankStore.hydrate();

  app.use(router);

  router.beforeEach((to) => {
    const title = to.meta?.title ? `刷题小站 · ${to.meta.title}` : '刷题小站';
    document.title = title;

    if (
      ['practice', 'exam', 'review'].includes(String(to.name)) &&
      !bankStore.hasBank
    ) {
      return { name: 'home' };
    }

    return true;
  });

  app.mount('#app');
}

bootstrap();
