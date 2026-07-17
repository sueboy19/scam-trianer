import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  { path: '/', name: 'home', component: () => import('../pages/HomePage.vue') },
  { path: '/login', name: 'login', component: () => import('../pages/LoginPage.vue') },
  { path: '/category/:category', name: 'scenario-list', component: () => import('../pages/ScenarioListPage.vue') },
  { path: '/quiz/:id', name: 'quiz', component: () => import('../pages/QuizPage.vue') },
  { path: '/result/:attemptId', name: 'result', component: () => import('../pages/ResultPage.vue') },
  { path: '/history', name: 'history', component: () => import('../pages/HistoryPage.vue') },
  { path: '/stats', name: 'stats', component: () => import('../pages/StatsPage.vue') },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  },
});

export default router;
