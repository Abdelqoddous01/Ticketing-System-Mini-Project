<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import { useI18n } from 'vue-i18n'

import { useAuthStore } from '../stores/authStore'
import LanguageSwitcher from './LanguageSwitcher.vue'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const authStore = useAuthStore()
const { t } = useI18n()

const isLoggingOut = ref(false)

const currentPageTitle = computed(() => {
  const titleKey = route.meta?.titleKey
  if (typeof titleKey === 'string' && titleKey.trim().length > 0) {
    return t(titleKey)
  }

  if (typeof route.name === 'string' && route.name.length > 0) {
    return route.name
  }

  return t('app.name')
})

const userInfo = computed(() => {
  if (!authStore.user) {
    return t('app.guest')
  }

  const role = authStore.user.role ? ` (${t(`user.roles.${authStore.user.role}`)})` : ''
  return `${authStore.user.email}${role}`
})

const canLogout = computed(() => authStore.isAuthenticated)

async function onLogout() {
  if (!canLogout.value) {
    return
  }

  isLoggingOut.value = true

  try {
    await authStore.logout()
    toast.add({
      severity: 'success',
      summary: t('auth.logout.summary'),
      detail: t('auth.logout.detail'),
      life: 2200,
    })
    await router.push('/login')
  } finally {
    isLoggingOut.value = false
  }
}
</script>

<template>
  <header class="app-header">
    <div class="header-left">
      <h1>{{ currentPageTitle }}</h1>
    </div>

    <div class="header-right">
      <span class="user-info">{{ userInfo }}</span>
      <LanguageSwitcher v-if="canLogout" />
      <Button
        v-if="canLogout"
        icon="pi pi-sign-out"
        severity="secondary"
        :loading="isLoggingOut"
        @click="onLogout"
      />
    </div>
  </header>
</template>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 40;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.7rem;
  border-bottom: 1px solid #e5e7eb;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(10px);
}

.header-left h1 {
  margin: 0;
  font-size: 1.6rem;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.user-info {
  font-size: 1.2rem;
  font-weight: bold;
  color: #374151;
}
</style>
