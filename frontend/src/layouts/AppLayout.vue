<script setup>
import { computed } from 'vue'

import AdminSidebar from '../components/AdminSidebar.vue'
import AppHeader from '../components/AppHeader.vue'
import { useAuthStore } from '../stores/authStore'

const props = defineProps({
  showHeader: {
    type: Boolean,
    default: true,
  },
})

const authStore = useAuthStore()

const isAdmin = computed(
  () => props.showHeader && authStore.isAuthenticated && authStore.user?.role === 'admin',
)

const currentPageTitle = computed(() => {
  const title = route.meta?.title
  if (typeof title === 'string' && title.trim().length > 0) {
    return title
  }

  if (typeof route.name === 'string' && route.name.length > 0) {
    return route.name
  }

  return 'Ticketing System'
})
</script>

<template>
  <div class="app-layout">
    <AppHeader v-if="showHeader" />

    <div class="app-shell">
      <AdminSidebar v-if="isAdmin" />

      <main class="app-content">
        <slot />
      </main>
    </div>
  </div>
</template>

<style scoped>
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-shell {
  flex: 1;
  min-height: 0;
  display: flex;
}

.app-content {
  flex: 1;
  min-width: 0;
}

@media (max-width: 900px) {
  .app-shell {
    flex-direction: column;
  }
}
</style>
