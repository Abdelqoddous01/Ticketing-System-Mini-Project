<script setup>
import { onBeforeUnmount, onMounted } from 'vue'
import { RouterView } from 'vue-router'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'

const toast = useToast()

function onSessionExpired(event) {
  const detail = event?.detail?.message || 'Session expired, please log in again.'

  toast.add({
    severity: 'warn',
    summary: 'Session expired',
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
  <RouterView />
</template>
