import { createRouter, createWebHashHistory } from 'vue-router';
import HomePage from '../pages/HomePage.vue';
import PracticePage from '../pages/PracticePage.vue';
import ExamPage from '../pages/ExamPage.vue';
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
      path: '/practice',
      name: 'practice',
      component: PracticePage,
      meta: { title: '练习模式' },
    },
    {
      path: '/exam',
      name: 'exam',
      component: ExamPage,
      meta: { title: '考试模式' },
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
