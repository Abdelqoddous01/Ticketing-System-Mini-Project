<script setup>
import AppHeader from '../components/AppHeader.vue'

defineProps({
  showHeader: {
    type: Boolean,
    default: true,
  },
})
</script>

<template>
  <div class="app-layout">
    <AppHeader v-if="showHeader" />
    <main class="app-content">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-content {
  flex: 1;
}
</style>
