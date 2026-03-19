import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

import LoginView from '../views/LoginView.vue'
import RegistrationView from '../views/RegistrationView.vue'
import TicketListView from '../views/TicketListView.vue'
import TicketDetailView from '../views/TicketDetailView.vue'
import TicketCreateView from '../views/TicketCreateView.vue'
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
    meta: { public: true, title: 'Login' },
  },
  {
    path: '/register',
    name: 'register',
    component: RegistrationView,
    meta: { public: true, title: 'Register' },
  },
  {
    path: '/tickets',
    name: 'tickets',
    component: TicketListView,
    meta: { title: 'Tickets' },
  },
  {
    path: '/tickets/create',
    name: 'ticket-create',
    component: TicketCreateView,
    meta: { roles: ['customer'], title: 'Create Ticket' },
  },
  {
    path: '/tickets/:id',
    name: 'ticket-detail',
    component: TicketDetailView,
    meta: { title: 'Ticket Details' },
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

  const requiredRoles = (Array.isArray(to.meta.roles) ? to.meta.roles : []) as string[]
  if (requiredRoles.length > 0) {
    const role = authStore.user?.role
    if (!role || !requiredRoles.includes(role)) {
      return '/tickets'
    }
  }

  return true
})

export default router
