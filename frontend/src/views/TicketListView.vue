<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import Card from 'primevue/card'
import Button from 'primevue/button'

import { useAuthStore } from '../stores/authStore'

const router = useRouter()
const toast = useToast()
const authStore = useAuthStore()

const isLoggingOut = ref(false)

async function onLogout() {
  isLoggingOut.value = true

  try {
    await authStore.logout()

    toast.add({
      severity: 'success',
      summary: 'Logged out',
      detail: 'You have been logged out.',
      life: 2200,
    })

    await router.push('/login')
  } finally {
    isLoggingOut.value = false
  }
}
</script>

<template>
  <div class="tickets-page">
    <Card class="ticket-card">
      <template #title>Ticket List</template>
      <template #content>
        <p>This page is protected and will host tickets soon.</p>
        <p v-if="authStore.user">
          Logged in as <strong>{{ authStore.user.email }}</strong>
          <span v-if="authStore.user.role"> ({{ authStore.user.role }})</span>
        </p>
        <Button
          label="Logout"
          severity="secondary"
          :loading="isLoggingOut"
          @click="onLogout"
        />
      </template>
    </Card>
  </div>
</template>

<style scoped>
.tickets-page {
  min-height: 100vh;
  padding: 2rem 1rem;
}

.ticket-card {
  max-width: 720px;
  margin: 0 auto;
}
</style>
