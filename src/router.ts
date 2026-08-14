import { createRouter, createWebHistory } from 'vue-router'
import HomeView from './views/HomeView.vue'
import PackageView from './views/PackageView.vue'

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/p/:name', name: 'package', component: PackageView, props: true },
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})
