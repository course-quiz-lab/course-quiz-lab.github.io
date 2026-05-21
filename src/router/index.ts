import { createRouter, createWebHashHistory } from 'vue-router';
import HomePage from '../pages/HomePage.vue';

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomePage,
    },
    {
      path: '/import',
      name: 'import',
      component: () => import('../pages/ImportPage.vue'),
      meta: { title: '导入题库' },
    },
    {
      path: '/banks/manage',
      name: 'bank-manage',
      component: () => import('../pages/BankManagePage.vue'),
      meta: { title: '管理题库' },
    },
    {
      path: '/banks',
      name: 'banks',
      component: () => import('../pages/BankSelectPage.vue'),
      meta: { title: '选择题库' },
    },
    {
      path: '/banks/:bankId/configure',
      name: 'bank-configure',
      component: () => import('../pages/QuizConfigPage.vue'),
      meta: { title: '答题配置' },
    },
    {
      name: 'quiz',
      path: '/:mode(practice|exam)',
      component: () => import('../pages/QuizPage.vue'),
      meta: { title: '答题模式' },
    },
    {
      path: '/review',
      name: 'review',
      component: () => import('../pages/ReviewPage.vue'),
      meta: { title: '结果回顾' },
    },
  ],
  scrollBehavior() {
    return { top: 0 };
  },
});

export default router;
