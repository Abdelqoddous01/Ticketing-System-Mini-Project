import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

import LoginView from '../views/LoginView.vue'
import RegistrationView from '../views/RegistrationView.vue'
import TicketListView from '../views/TicketListView.vue'
import { useAuthStore } from '../stores/authStore'
import { pinia } from '../stores/pinia'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/tickets',
  },
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: { public: true },
  },
  {
    path: '/register',
    name: 'register',
    component: RegistrationView,
    meta: { public: true },
  },
  {
    path: '/tickets',
    name: 'tickets',
    component: TicketListView,
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/tickets',
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to) => {
  const authStore = useAuthStore(pinia)

  if (!authStore.isInitialized) {
    authStore.initializeAuth()
  }

  if (to.meta.public) {
    if (authStore.isAuthenticated) {
      return '/tickets'
    }

    return true
  }

  if (!authStore.isAuthenticated) {
    return {
      path: '/login',
      query: { redirect: to.fullPath },
    }
  }

  return true
})

export default router
