<script setup>
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'
import { useI18n } from 'vue-i18n'

import AppLayout from './layouts/AppLayout.vue'
import LanguageSwitcher from './components/LanguageSwitcher.vue'
import { useAuthStore } from './stores/authStore'

const toast = useToast()
const route = useRoute()
const { t } = useI18n()
const authStore = useAuthStore()
const isPublicRoute = computed(() => Boolean(route.meta?.public))
const showFloatingLanguageSwitcher = computed(() => !authStore.isAuthenticated)

function onSessionExpired(event) {
  const detail = event?.detail?.message || t('session.expiredDetailDefault')

  toast.add({
    severity: 'warn',
    summary: t('session.expiredSummary'),
    detail,
    life: 4200,
  })
}

onMounted(() => {
  window.addEventListener('auth:session-expired', onSessionExpired)
})

onBeforeUnmount(() => {
  window.removeEventListener('auth:session-expired', onSessionExpired)
})
</script>

<template>
  <Toast position="top-right" />
  <div
    v-if="showFloatingLanguageSwitcher"
    class="language-switcher-floating"
    :class="{ 'public-route': isPublicRoute }"
  >
    <LanguageSwitcher />
  </div>
  <AppLayout :show-header="!isPublicRoute">
    <RouterView />
  </AppLayout>
</template>

<style scoped>
.language-switcher-floating {
  position: fixed;
  top: 0.8rem;
  right: 0.9rem;
  z-index: 90;
  padding: 0.55rem 0.6rem;
  border: 1px solid #dbe5f1;
  border-radius: 0.75rem;
  background: rgba(255, 255, 255, 0.93);
  backdrop-filter: blur(4px);
}

.language-switcher-floating.public-route {
  top: 1rem;
}
</style>
