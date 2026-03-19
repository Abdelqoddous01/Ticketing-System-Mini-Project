<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import Card from 'primevue/card'
import Panel from 'primevue/panel'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'

import { useAuthStore } from '../stores/authStore'
import { useTicketStore } from '../stores/ticketStore'
import { renderMarkdown } from '../utils/markdown'

const router = useRouter()
const toast = useToast()
const authStore = useAuthStore()
const ticketStore = useTicketStore()

const isSubmitting = ref(false)

const form = reactive({
  title: '',
  description: '',
})

const isCustomer = computed(() => authStore.user?.role === 'customer')
const renderedPreview = computed(() => renderMarkdown(form.description))

function extractErrorMessage(error, fallback) {
  const detail = error?.response?.data

  if (typeof detail === 'string') {
    return detail
  }

  if (detail?.error) {
    return detail.error
  }

  if (detail?.detail) {
    return detail.detail
  }

  if (detail && typeof detail === 'object') {
    const firstKey = Object.keys(detail)[0]
    const firstValue = detail[firstKey]
    if (Array.isArray(firstValue) && firstValue.length > 0) {
      return String(firstValue[0])
    }
  }

  if (typeof error?.message === 'string') {
    return error.message
  }

  return fallback
}

async function onSubmit() {
  const payload = {
    title: form.title.trim(),
    description: form.description.trim(),
  }

  if (!payload.title || !payload.description) {
    toast.add({
      severity: 'warn',
      summary: 'Missing fields',
      detail: 'Title and description are required.',
      life: 3200,
    })
    return
  }

  isSubmitting.value = true

  try {
    const ticket = await ticketStore.createTicket(payload)

    toast.add({
      severity: 'success',
      summary: 'Ticket created',
      detail: 'Your ticket has been created.',
      life: 2600,
    })

    await router.push(`/tickets/${ticket.id}`)
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Create ticket failed',
      detail: extractErrorMessage(error, 'Unable to create the ticket.'),
      life: 4500,
    })
  } finally {
    isSubmitting.value = false
  }
}

onMounted(async () => {
  if (isCustomer.value) {
    return
  }

  toast.add({
    severity: 'warn',
    summary: 'Access denied',
    detail: 'Only customers can create tickets.',
    life: 3400,
  })
  await router.replace('/tickets')
})
</script>

<template>
  <div class="ticket-create-page">
    <Card>
      <template #title>Create Ticket</template>
      <template #content>
        <form class="ticket-form" @submit.prevent="onSubmit">
          <div class="field">
            <label for="ticket-title">Title</label>
            <InputText
              id="ticket-title"
              v-model="form.title"
              maxlength="255"
              placeholder="Short summary of your issue"
            />
          </div>

          <div class="field">
            <label for="ticket-description">Description (Markdown supported)</label>
            <Textarea
              id="ticket-description"
              v-model="form.description"
              rows="10"
              auto-resize
              placeholder="Describe your issue. You can use Markdown."
            />
          </div>

          <div class="form-actions">
            <Button
              type="button"
              label="Cancel"
              severity="secondary"
              outlined
              @click="router.push('/tickets')"
            />
            <Button
              type="submit"
              label="Create Ticket"
              icon="pi pi-check"
              :loading="isSubmitting || ticketStore.isSaving"
            />
          </div>
        </form>

        <Panel header="Markdown Preview" class="preview-panel">
          <div class="markdown-body" v-html="renderedPreview" />
        </Panel>
      </template>
    </Card>
  </div>
</template>

<style scoped>
.ticket-create-page {
  min-height: 100vh;
  padding: 2rem 1rem;
}

.ticket-form {
  display: grid;
  gap: 1rem;
}

.field {
  display: grid;
  gap: 0.4rem;
}

.field :deep(input),
.field :deep(textarea) {
  width: 100%;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
}

.preview-panel {
  margin-top: 1rem;
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(p),
.markdown-body :deep(ul),
.markdown-body :deep(blockquote) {
  margin: 0 0 0.75rem;
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
