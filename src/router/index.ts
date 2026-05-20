import { createRouter, createWebHashHistory } from 'vue-router';
import HomePage from '../pages/HomePage.vue';
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
