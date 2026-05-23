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
      redirect: '/import/select',
    },
    {
      path: '/import/select',
      name: 'import-select',
      component: () => import('../pages/import/ImportSelectPage.vue'),
      meta: { title: '选择导入方式', back: '/' },
    },
    {
      path: '/import/json',
      name: 'import-json',
      component: () => import('../pages/import/ImportJsonPage.vue'),
      meta: { title: '上传 JSON', back: '/import/select' },
    },
    {
      path: '/import/fetch',
      name: 'import-fetch',
      component: () => import('../pages/import/ImportFetchPage.vue'),
      meta: { title: '链接导入', back: '/import/select' },
    },
    {
      path: '/import/table',
      name: 'import-table',
      component: () => import('../pages/import/ImportTablePage.vue'),
      meta: { title: '导入 Excel', back: '/import/select' },
    },
    {
      path: '/import/cloud',
      name: 'import-cloud',
      component: () => import('../pages/import/ImportCloudPage.vue'),
      meta: { title: '云端题库', back: '/import/select' },
    },
    {
      path: '/import/preview',
      name: 'import-preview',
      component: () => import('../pages/import/ImportPreviewPage.vue'),
      meta: { title: '预览与确认', back: '/import/select' },
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
