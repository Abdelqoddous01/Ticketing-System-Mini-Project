<script setup>
import { nextTick, ref, watch } from 'vue'
import Divider from 'primevue/divider'
import ProgressSpinner from 'primevue/progressspinner'
import MessageItem from './MessageItem.vue'

const props = defineProps({
  messages: {
    type: Array,
    default: () => [],
  },
  isLoading: {
    type: Boolean,
    default: false,
  },
  currentUserId: {
    type: Number,
    default: -1,
  },
})

const containerRef = ref(null)

function scrollToLatest(behavior = 'smooth') {
  if (!containerRef.value) {
    return
  }

  containerRef.value.scrollTo({
    top: containerRef.value.scrollHeight,
    behavior,
  })
}

watch(
  () => props.messages.length,
  async (_, previousLength) => {
    await nextTick()
    const behavior = previousLength === 0 ? 'auto' : 'smooth'
    scrollToLatest(behavior)
  },
  { immediate: true },
)
</script>

<template>
  <div ref="containerRef" class="message-thread">
    <div v-if="isLoading" class="centered">
      <ProgressSpinner style="width: 28px; height: 28px" />
    </div>
    <div v-else-if="messages.length === 0" class="empty-state">
      No messages yet.
    </div>
    <template v-else>
      <div v-for="(message, index) in messages" :key="message.id" class="message-row">
        <MessageItem :message="message" :current-user-id="currentUserId" />
        <Divider v-if="index < messages.length - 1" />
      </div>
    </template>
  </div>
</template>

<style scoped>
.message-thread {
  max-height: 460px;
  overflow-y: auto;
  padding-right: 0.25rem;
}

.centered {
  display: grid;
  place-items: center;
  min-height: 120px;
}

.empty-state {
  color: #6b7280;
  min-height: 76px;
  display: grid;
  align-items: center;
}

.message-row :deep(.p-divider-horizontal) {
  margin: 0.7rem 0;
}
</style>
