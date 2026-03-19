<script setup>
import { computed } from 'vue'
import { renderMarkdown } from '../utils/markdown'

const props = defineProps({
  message: {
    type: Object,
    required: true,
  },
  currentUserId: {
    type: Number,
    default: -1,
  },
})

const isCurrentUser = computed(() => {
  return props.currentUserId > 0 && props.message.author === props.currentUserId
})

const authorLabel = computed(() => {
  if (isCurrentUser.value) {
    return 'You'
  }

  if (props.message.author_email) {
    return props.message.author_email
  }

  if (props.message.author) {
    return `User #${props.message.author}`
  }

  return 'Unknown user'
})

const renderedBody = computed(() => renderMarkdown(props.message.body || ''))

const createdAtLabel = computed(() => {
  if (!props.message.created_at) {
    return '-'
  }

  return new Date(props.message.created_at).toLocaleString()
})

const statusLabel = computed(() => (props.message.isOptimistic ? 'Sending...' : createdAtLabel.value))
</script>

<template>
  <article class="message-item" :class="{ own: isCurrentUser }">
    <header class="message-meta">
      <strong>{{ authorLabel }}</strong>
      <small>{{ statusLabel }}</small>
    </header>
    <div class="message-bubble markdown-body" v-html="renderedBody" />
  </article>
</template>

<style scoped>
.message-item {
  display: grid;
  gap: 0.4rem;
}

.message-item.own {
  justify-items: end;
}

.message-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: #4b5563;
  font-size: 0.88rem;
  flex-wrap: wrap;
}

.message-bubble {
  width: min(100%, 740px);
  background: #ffffff;
  border: 1px solid #e5e7eb;
  color: #000000;
  font-weight: 600;
  border-radius: 0.85rem;
  padding: 0.75rem 0.9rem;
}

.message-item.own .message-bubble {
  background: #eff6ff;
  border-color: #bfdbfe;
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(p),
.markdown-body :deep(ul),
.markdown-body :deep(blockquote) {
  margin: 0 0 0.7rem;
}

.markdown-body :deep(p:last-child),
.markdown-body :deep(ul:last-child),
.markdown-body :deep(blockquote:last-child) {
  margin-bottom: 0;
}

.markdown-body :deep(code) {
  background-color: #e5e7eb;
  border-radius: 4px;
  padding: 0.1rem 0.3rem;
}

.markdown-body :deep(blockquote) {
  border-left: 3px solid #9ca3af;
  padding-left: 0.75rem;
  color: #374151;
}
</style>
