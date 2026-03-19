<script setup>
import { computed } from 'vue'
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  loading: {
    type: Boolean,
    default: false,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue', 'send'])

const draft = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

const canSubmit = computed(() => {
  return !props.loading && !props.disabled && Boolean(draft.value.trim())
})

function submitMessage() {
  if (!canSubmit.value) {
    return
  }

  emit('send')
}

function onKeydown(event) {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault()
    submitMessage()
  }
}
</script>

<template>
  <div class="message-input">
    <Textarea
      v-model="draft"
      auto-resize
      rows="4"
      class="w-full"
      placeholder="Type a message..."
      :disabled="disabled"
      @keydown="onKeydown"
    />
    <div class="input-footer">
      <small class="hint">Use Ctrl+Enter to send</small>
      <Button
        label="Send"
        icon="pi pi-send"
        :loading="loading"
        :disabled="!canSubmit"
        @click="submitMessage"
      />
    </div>
  </div>
</template>

<style scoped>
.message-input {
  display: grid;
  gap: 0.7rem;
}

.input-footer {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: center;
}

.hint {
  color: #6b7280;
}

.w-full {
  width: 100%;
}
</style>
