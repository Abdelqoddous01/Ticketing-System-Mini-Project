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
</script>

<template>
  <div class="app-layout">
    <div class="app-shell" :class="{ 'with-sidebar': isAdmin }">
      <AdminSidebar v-if="isAdmin" />

      <div class="app-main">
        <AppHeader v-if="showHeader" />

        <main class="app-content">
          <slot />
        </main>
      </div>
    </div>
  </div>
</template>

<style scoped>
.app-layout {
  min-height: 100vh;
}

.app-shell {
  display: flex;
  min-height: 100vh;
}

.app-main {
  flex: 1;
  min-width: 0;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-content {
  flex: 1;
  min-width: 0;
}

@media (max-width: 900px) {
  .app-shell {
    flex-direction: column;
  }

  .app-main {
    min-height: 0;
  }
}
</style>
