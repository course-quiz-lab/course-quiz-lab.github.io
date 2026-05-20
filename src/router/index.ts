import { createRouter, createWebHashHistory } from 'vue-router';
import HomePage from '../pages/HomePage.vue';
import ImportPage from '../pages/ImportPage.vue';
import BankManagePage from '../pages/BankManagePage.vue';
import BankSelectPage from '../pages/BankSelectPage.vue';
import QuizConfigPage from '../pages/QuizConfigPage.vue';
import QuizPage from '../pages/QuizPage.vue';
import ReviewPage from '../pages/ReviewPage.vue';

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
      component: ImportPage,
      meta: { title: '导入题库' },
    },
    {
      path: '/banks/manage',
      name: 'bank-manage',
      component: BankManagePage,
      meta: { title: '管理题库' },
    },
    {
      path: '/banks',
      name: 'banks',
      component: BankSelectPage,
      meta: { title: '选择题库' },
    },
    {
      path: '/banks/:bankId/configure',
      name: 'bank-configure',
      component: QuizConfigPage,
      meta: { title: '答题配置' },
    },
    {
      name: 'quiz',
      path: '/:mode(practice|exam)',
      component: QuizPage,
      meta: { title: '答题模式' },
    },
    {
      path: '/review',
      name: 'review',
      component: ReviewPage,
      meta: { title: '结果回顾' },
    },
  ],
  scrollBehavior() {
    return { top: 0 };
  },
});

export default router;
