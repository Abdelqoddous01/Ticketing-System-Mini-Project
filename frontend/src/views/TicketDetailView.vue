<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import Card from 'primevue/card'
import Panel from 'primevue/panel'
import Button from 'primevue/button'
import Dropdown from 'primevue/dropdown'
import Divider from 'primevue/divider'
import ProgressSpinner from 'primevue/progressspinner'

import { useAuthStore } from '../stores/authStore'
import { useTicketStore } from '../stores/ticketStore'
import StatusBadge from '../components/StatusBadge.vue'
import PriorityBadge from '../components/PriorityBadge.vue'
import MessageThread from '../components/MessageThread.vue'
import MessageInput from '../components/MessageInput.vue'
import { renderMarkdown } from '../utils/markdown'
import { getTicketMessages, sendTicketMessage } from '../services/messageService'
import { TICKET_PRIORITY_OPTIONS, TICKET_STATUS_OPTIONS } from '../services/ticketService'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const authStore = useAuthStore()
const ticketStore = useTicketStore()

const selectedStatus = ref(null)
const selectedPriority = ref(null)
const selectedAgent = ref(null)

const messages = ref([])
const isLoadingMessages = ref(false)
const isSendingMessage = ref(false)
const messageDraft = ref('')

const ticket = computed(() => ticketStore.selectedTicket)
const ticketId = computed(() => Number(route.params.id))
const currentUserId = computed(() => (Number.isInteger(authStore.user?.id) ? authStore.user.id : -1))

const userRole = computed(() => authStore.user?.role)
const canUpdateStatus = computed(() => userRole.value === 'agent' || userRole.value === 'admin')
const canUpdatePriority = computed(() => userRole.value === 'admin')
const canAssignAgent = computed(() => userRole.value === 'admin')
const canDeleteTicket = computed(() => userRole.value === 'admin')
const canSaveAny = computed(
  () => canUpdateStatus.value || canUpdatePriority.value || canAssignAgent.value,
)

const statusOptions = TICKET_STATUS_OPTIONS
const priorityOptions = TICKET_PRIORITY_OPTIONS

const agentOptions = computed(() => {
  const options = ticketStore.agents.map((agent) => ({
    label: agent.email,
    value: agent.id,
  }))

  return [{ label: 'Unassigned', value: null }, ...options]
})

const renderedDescription = computed(() => renderMarkdown(ticket.value?.description || ''))

const hasPendingChanges = computed(() => {
  if (!ticket.value) {
    return false
  }

  const statusChanged =
    canUpdateStatus.value &&
    selectedStatus.value &&
    selectedStatus.value !== ticket.value.status

  const priorityChanged =
    canUpdatePriority.value &&
    selectedPriority.value &&
    selectedPriority.value !== ticket.value.priority

  const assignmentChanged =
    canAssignAgent.value &&
    selectedAgent.value !== ticket.value.assigned_to

  return Boolean(statusChanged || priorityChanged || assignmentChanged)
})

function userLabel(userId) {
  return userId ? `User #${userId}` : 'Unassigned'
}

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

function normalizeMessage(message) {
  return {
    id: message.id,
    ticket: message.ticket,
    author: message.author ?? null,
    author_email: message.author_email ?? null,
    author_role: message.author_role ?? null,
    body: message.body || '',
    created_at: message.created_at || new Date().toISOString(),
    isOptimistic: Boolean(message.isOptimistic),
  }
}

async function loadMessages() {
  if (!Number.isInteger(ticketId.value) || ticketId.value <= 0) {
    messages.value = []
    return
  }

  isLoadingMessages.value = true

  try {
    const data = await getTicketMessages(ticketId.value)
    messages.value = Array.isArray(data) ? data.map(normalizeMessage) : []
  } finally {
    isLoadingMessages.value = false
  }
}

async function refreshMessages() {
  try {
    await loadMessages()
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Unable to load messages',
      detail: extractErrorMessage(error, 'Could not fetch ticket messages.'),
      life: 4200,
    })
  }
}

async function sendMessage() {
  if (!ticket.value || isSendingMessage.value) {
    return
  }

  const body = messageDraft.value.trim()
  if (!body) {
    return
  }

  const optimisticId = `temp-${Date.now()}-${Math.random().toString(16).slice(2)}`
  const optimisticMessage = normalizeMessage({
    id: optimisticId,
    ticket: ticket.value.id,
    author: currentUserId.value,
    author_email: authStore.user?.email ?? null,
    author_role: authStore.user?.role ?? null,
    body,
    created_at: new Date().toISOString(),
    isOptimistic: true,
  })

  messages.value = [...messages.value, optimisticMessage]
  messageDraft.value = ''
  isSendingMessage.value = true

  try {
    const savedMessage = normalizeMessage(await sendTicketMessage(ticket.value.id, { body }))
    const messageIndex = messages.value.findIndex((message) => message.id === optimisticId)

    if (messageIndex === -1) {
      messages.value.push(savedMessage)
    } else {
      messages.value.splice(messageIndex, 1, savedMessage)
    }
  } catch (error) {
    messages.value = messages.value.filter((message) => message.id !== optimisticId)
    messageDraft.value = body
    toast.add({
      severity: 'error',
      summary: 'Message failed',
      detail: extractErrorMessage(error, 'Unable to send message.'),
      life: 4200,
    })
  } finally {
    isSendingMessage.value = false
  }
}

async function loadTicketData() {
  if (!Number.isInteger(ticketId.value) || ticketId.value <= 0) {
    messages.value = []
    messageDraft.value = ''
    await router.replace('/tickets')
    return
  }

  try {
    await Promise.all([ticketStore.fetchTicket(ticketId.value), loadMessages()])

    if (canAssignAgent.value) {
      await ticketStore.fetchAgents()
    }
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Unable to load ticket',
      detail: extractErrorMessage(error, 'Could not fetch ticket details.'),
      life: 4500,
    })
  }
}

async function saveChanges() {
  if (!ticket.value || !canSaveAny.value) {
    return
  }

  const statusChanged =
    canUpdateStatus.value &&
    selectedStatus.value &&
    selectedStatus.value !== ticket.value.status
  const priorityChanged =
    canUpdatePriority.value &&
    selectedPriority.value &&
    selectedPriority.value !== ticket.value.priority
  const assignmentChanged =
    canAssignAgent.value &&
    selectedAgent.value !== ticket.value.assigned_to

  if (!statusChanged && !priorityChanged && !assignmentChanged) {
    toast.add({
      severity: 'info',
      summary: 'No changes',
      detail: 'There is nothing new to save.',
      life: 2200,
    })
    return
  }

  try {
    if (statusChanged) {
      await ticketStore.updateTicketStatus(ticket.value.id, selectedStatus.value)
    }

    if (priorityChanged) {
      await ticketStore.updateTicketPriority(ticket.value.id, selectedPriority.value)
    }

    if (assignmentChanged) {
      await ticketStore.assignTicket(ticket.value.id, selectedAgent.value)
    }

    toast.add({
      severity: 'success',
      summary: 'Ticket updated',
      detail: 'Your changes have been saved.',
      life: 2600,
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Save failed',
      detail: extractErrorMessage(error, 'Unable to save your changes.'),
      life: 4200,
    })
  }
}

async function deleteTicket() {
  if (!ticket.value) {
    return
  }

  if (!window.confirm('Delete this ticket permanently?')) {
    return
  }

  try {
    await ticketStore.deleteTicket(ticket.value.id)
    toast.add({
      severity: 'success',
      summary: 'Ticket deleted',
      detail: 'The ticket has been removed.',
      life: 2400,
    })
    await router.push('/tickets')
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Delete failed',
      detail: extractErrorMessage(error, 'Unable to delete this ticket.'),
      life: 4200,
    })
  }
}

watch(
  ticket,
  (value) => {
    selectedStatus.value = value?.status ?? null
    selectedPriority.value = value?.priority ?? null
    selectedAgent.value = value?.assigned_to ?? null
  },
  { immediate: true },
)

watch(
  () => route.params.id,
  () => {
    loadTicketData()
  },
)

onMounted(loadTicketData)
</script>

<template>
  <div class="ticket-detail-page">
    <div class="page-toolbar">
      <Button
        label="Back to Tickets"
        icon="pi pi-arrow-left"
        text
        @click="router.push('/tickets')"
      />
      <Button
        label="Refresh"
        icon="pi pi-refresh"
        severity="secondary"
        :loading="ticketStore.isLoadingTicket || isLoadingMessages"
        @click="loadTicketData"
      />
    </div>

    <div v-if="ticketStore.isLoadingTicket" class="centered">
      <ProgressSpinner />
    </div>

    <div v-else-if="ticket" class="detail-grid">
      <div class="main-column">
        <Card>
          <template #title>{{ ticket.title }}</template>
          <template #subtitle>
            <div class="badges-row">
              <StatusBadge :value="ticket.status" />
              <PriorityBadge :value="ticket.priority" />
            </div>
          </template>
          <template #content>
            <div class="meta-grid">
              <div><strong>Created By:</strong> {{ userLabel(ticket.created_by) }}</div>
              <div><strong>Assigned To:</strong> {{ userLabel(ticket.assigned_to) }}</div>
              <div><strong>Created At:</strong> {{ new Date(ticket.created_at).toLocaleString() }}</div>
              <div><strong>Updated At:</strong> {{ new Date(ticket.updated_at).toLocaleString() }}</div>
            </div>

            <Panel header="Description" toggleable class="description-panel">
              <div class="markdown-body" v-html="renderedDescription" />
            </Panel>
          </template>
        </Card>

        <Panel header="Messages Thread" class="messages-panel">
          <template #icons>
            <Button
              icon="pi pi-refresh"
              text
              rounded
              :loading="isLoadingMessages"
              @click="refreshMessages"
            />
          </template>

          <div class="messages-content">
            <MessageThread
              :messages="messages"
              :is-loading="isLoadingMessages"
              :current-user-id="currentUserId"
            />
            <Divider />
            <MessageInput
              v-model="messageDraft"
              :loading="isSendingMessage"
              :disabled="!ticket"
              @send="sendMessage"
            />
          </div>
        </Panel>
      </div>

      <div class="sidebar-column">
        <Panel header="Actions">
          <div class="action-group">
            <h4>Update Status</h4>
            <p class="action-note">Allowed for agent and admin.</p>
            <Dropdown
              v-model="selectedStatus"
              :options="statusOptions"
              option-label="label"
              option-value="value"
              placeholder="Select status"
              class="w-full"
              :disabled="!canUpdateStatus"
            />
          </div>

          <div class="action-group">
            <h4>Update Priority</h4>
            <p class="action-note">Allowed for admin only.</p>
            <Dropdown
              v-model="selectedPriority"
              :options="priorityOptions"
              option-label="label"
              option-value="value"
              placeholder="Select priority"
              class="w-full"
              :disabled="!canUpdatePriority"
            />
          </div>

          <div class="action-group">
            <h4>Assign Agent</h4>
            <p class="action-note">Allowed for admin only.</p>
            <Dropdown
              v-model="selectedAgent"
              :options="agentOptions"
              option-label="label"
              option-value="value"
              placeholder="Select an agent"
              class="w-full"
              :disabled="!canAssignAgent"
            />
          </div>

          <div class="action-group">
            <Button
              label="Save Changes"
              icon="pi pi-save"
              class="w-full"
              :disabled="!canSaveAny || !hasPendingChanges"
              :loading="ticketStore.isSaving"
              @click="saveChanges"
            />
          </div>

          <div v-if="canDeleteTicket" class="action-group">
            <h4>Danger Zone</h4>
            <Button
              label="Delete Ticket"
              severity="danger"
              outlined
              class="w-full"
              :loading="ticketStore.isSaving"
              @click="deleteTicket"
            />
          </div>
        </Panel>
      </div>
    </div>

    <Card v-else>
      <template #title>Ticket not found</template>
      <template #content>
        <p>This ticket is unavailable or you do not have permission to access it.</p>
      </template>
    </Card>
  </div>
</template>

<style scoped>
.ticket-detail-page {
  min-height: 100vh;
  padding: 2rem 1rem;
}

.page-toolbar {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.centered {
  display: grid;
  place-items: center;
  min-height: 120px;
}

.detail-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1rem;
}

.badges-row {
  display: flex;
  gap: 0.5rem;
}

.meta-grid {
  display: grid;
  gap: 0.6rem;
}

.description-panel {
  margin-top: 1rem;
}

.messages-panel {
  margin-top: 1rem;
}

.messages-content {
  display: grid;
  gap: 0.75rem;
}

.sidebar-column .action-group + .action-group {
  margin-top: 1.25rem;
}

.action-group h4 {
  margin: 0 0 0.35rem;
}

.action-note {
  margin: 0 0 0.6rem;
  color: #4b5563;
  font-size: 0.9rem;
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

.w-full {
  width: 100%;
}

@media (min-width: 1024px) {
  .detail-grid {
    grid-template-columns: minmax(0, 2fr) minmax(320px, 1fr);
    align-items: start;
  }
}
</style>
