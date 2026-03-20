<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import Card from 'primevue/card'
import Panel from 'primevue/panel'
import Button from 'primevue/button'
import Dropdown from 'primevue/dropdown'
import Divider from 'primevue/divider'
import ProgressSpinner from 'primevue/progressspinner'
import { useI18n } from 'vue-i18n'

import { useAuthStore } from '../stores/authStore'
import { useTicketStore } from '../stores/ticketStore'
import StatusBadge from '../components/StatusBadge.vue'
import PriorityBadge from '../components/PriorityBadge.vue'
import MessageThread from '../components/MessageThread.vue'
import MessageInput from '../components/MessageInput.vue'
import { renderMarkdown } from '../utils/markdown'
import {
  buildTicketMessagesSocketUrl,
  getTicketMessages,
  sendTicketMessage,
} from '../services/messageService'
import { TICKET_PRIORITY_OPTIONS, TICKET_STATUS_OPTIONS } from '../services/ticketService'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const authStore = useAuthStore()
const ticketStore = useTicketStore()
const { t, locale } = useI18n()

const selectedStatus = ref(null)
const selectedPriority = ref(null)
const selectedAgent = ref(null)

const messages = ref([])
const isLoadingMessages = ref(false)
const isSendingMessage = ref(false)
const messageDraft = ref('')
const messageSocket = ref(null)
const reconnectTimer = ref(null)
const reconnectAttempts = ref(0)
const shouldReconnect = ref(false)

const MAX_RECONNECT_DELAY_MS = 10000

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

const statusOptions = computed(() =>
  TICKET_STATUS_OPTIONS.map((option) => ({
    ...option,
    label: t(`tickets.status.${option.value}`),
  })),
)
const priorityOptions = computed(() =>
  TICKET_PRIORITY_OPTIONS.map((option) => ({
    ...option,
    label: t(`tickets.priority.${option.value}`),
  })),
)

const agentOptions = computed(() => {
  const options = ticketStore.agents.map((agent) => ({
    label: agent.email,
    value: agent.id,
  }))

  return [{ label: t('common.unassigned'), value: null }, ...options]
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

function userLabel(userId, userEmail = null) {
  if (!userId) {
    return t('common.unassigned')
  }

  return userEmail || t('user.fallback.indexed', { id: userId })
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

function dedupeMessagesById(items) {
  const seen = new Set()
  const dedupedReversed = []

  for (let index = items.length - 1; index >= 0; index -= 1) {
    const message = items[index]
    const key = String(message.id)

    if (seen.has(key)) {
      continue
    }

    seen.add(key)
    dedupedReversed.push(message)
  }

  return dedupedReversed.reverse()
}

function mergeMessage(rawMessage, replaceId = null) {
  const normalized = normalizeMessage(rawMessage)
  const nextMessages = [...messages.value]

  if (replaceId !== null) {
    const replaceIndex = nextMessages.findIndex((message) => String(message.id) === String(replaceId))

    if (replaceIndex !== -1) {
      nextMessages.splice(replaceIndex, 1, normalized)
    } else {
      nextMessages.push(normalized)
    }
  } else {
    const existingIndex = nextMessages.findIndex(
      (message) => String(message.id) === String(normalized.id),
    )

    if (existingIndex !== -1) {
      nextMessages.splice(existingIndex, 1, normalized)
    } else {
      nextMessages.push(normalized)
    }
  }

  messages.value = dedupeMessagesById(nextMessages)
}

function clearReconnectTimer() {
  if (reconnectTimer.value === null) {
    return
  }

  window.clearTimeout(reconnectTimer.value)
  reconnectTimer.value = null
}

function closeMessageSocket() {
  clearReconnectTimer()
  shouldReconnect.value = false
  reconnectAttempts.value = 0

  if (!messageSocket.value) {
    return
  }

  messageSocket.value.onopen = null
  messageSocket.value.onmessage = null
  messageSocket.value.onerror = null
  messageSocket.value.onclose = null

  if (
    messageSocket.value.readyState === WebSocket.OPEN ||
    messageSocket.value.readyState === WebSocket.CONNECTING
  ) {
    messageSocket.value.close(1000, 'socket-reset')
  }

  messageSocket.value = null
}

function scheduleSocketReconnect() {
  if (!shouldReconnect.value || reconnectTimer.value !== null) {
    return
  }

  const backoffDelay = Math.min(1000 * 2 ** reconnectAttempts.value, MAX_RECONNECT_DELAY_MS)
  reconnectAttempts.value += 1

  reconnectTimer.value = window.setTimeout(() => {
    reconnectTimer.value = null
    openMessageSocket()
  }, backoffDelay)
}

function handleSocketMessage(rawData) {
  let data

  try {
    data = JSON.parse(rawData)
  } catch {
    return
  }

  if (data?.type !== 'message.created' || !data?.payload) {
    return
  }

  mergeMessage(data.payload)
}

function openMessageSocket() {
  if (!Number.isInteger(ticketId.value) || ticketId.value <= 0) {
    return
  }

  if (!authStore.accessToken) {
    return
  }

  clearReconnectTimer()

  if (messageSocket.value) {
    messageSocket.value.close(1000, 'socket-reconnect')
    messageSocket.value = null
  }

  const socket = new WebSocket(buildTicketMessagesSocketUrl(ticketId.value, authStore.accessToken))
  messageSocket.value = socket

  socket.onopen = () => {
    reconnectAttempts.value = 0
  }

  socket.onmessage = (event) => {
    handleSocketMessage(event.data)
  }

  socket.onerror = () => {}

  socket.onclose = (event) => {
    if (messageSocket.value === socket) {
      messageSocket.value = null
    }

    if (!shouldReconnect.value) {
      return
    }

    if ([4400, 4401, 4403].includes(event.code)) {
      shouldReconnect.value = false
      return
    }

    if (event.code === 1000) {
      return
    }

    scheduleSocketReconnect()
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
      summary: t('tickets.detail.toast.messagesFailedSummary'),
      detail: extractErrorMessage(error, t('tickets.detail.toast.messagesFailedDetail')),
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
    const savedMessage = await sendTicketMessage(ticket.value.id, { body })
    mergeMessage(savedMessage, optimisticId)
  } catch (error) {
    messages.value = messages.value.filter((message) => message.id !== optimisticId)
    messageDraft.value = body
    toast.add({
      severity: 'error',
      summary: t('tickets.detail.toast.sendFailedSummary'),
      detail: extractErrorMessage(error, t('tickets.detail.toast.sendFailedDetail')),
      life: 4200,
    })
  } finally {
    isSendingMessage.value = false
  }
}

async function loadTicketData() {
  closeMessageSocket()

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

    shouldReconnect.value = true
    openMessageSocket()
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: t('tickets.detail.toast.loadFailedSummary'),
      detail: extractErrorMessage(error, t('tickets.detail.toast.loadFailedDetail')),
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
      summary: t('tickets.detail.toast.noChangesSummary'),
      detail: t('tickets.detail.toast.noChangesDetail'),
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
      summary: t('tickets.detail.toast.savedSummary'),
      detail: t('tickets.detail.toast.savedDetail'),
      life: 2600,
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: t('tickets.detail.toast.saveFailedSummary'),
      detail: extractErrorMessage(error, t('tickets.detail.toast.saveFailedDetail')),
      life: 4200,
    })
  }
}

async function deleteTicket() {
  if (!ticket.value) {
    return
  }

  if (!window.confirm(t('tickets.detail.deleteConfirm'))) {
    return
  }

  try {
    await ticketStore.deleteTicket(ticket.value.id)
    toast.add({
      severity: 'success',
      summary: t('tickets.detail.toast.deletedSummary'),
      detail: t('tickets.detail.toast.deletedDetail'),
      life: 2400,
    })
    await router.push('/tickets')
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: t('tickets.detail.toast.deleteFailedSummary'),
      detail: extractErrorMessage(error, t('tickets.detail.toast.deleteFailedDetail')),
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

onBeforeUnmount(() => {
  closeMessageSocket()
})

onMounted(loadTicketData)
</script>

<template>
  <div class="ticket-detail-page">
    <div class="page-toolbar">
      <Button
        :label="t('common.backToTickets')"
        icon="pi pi-arrow-left"
        text
        @click="router.push('/tickets')"
      />
      <Button
        :label="t('common.refresh')"
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
              <div><strong>{{ t('tickets.detail.meta.createdBy') }}</strong> {{ userLabel(ticket.created_by, ticket.created_by_email) }}</div>
              <div><strong>{{ t('tickets.detail.meta.assignedTo') }}</strong> {{ userLabel(ticket.assigned_to, ticket.assigned_to_email) }}</div>
              <div><strong>{{ t('tickets.detail.meta.createdAt') }}</strong> {{ new Date(ticket.created_at).toLocaleString(locale) }}</div>
              <div><strong>{{ t('tickets.detail.meta.updatedAt') }}</strong> {{ new Date(ticket.updated_at).toLocaleString(locale) }}</div>
            </div>

            <Panel :header="t('tickets.detail.description')" toggleable class="description-panel">
              <div class="markdown-body" v-html="renderedDescription" />
            </Panel>
          </template>
        </Card>

        <Panel :header="t('tickets.detail.messagesThread')" class="messages-panel">
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
        <Panel :header="t('tickets.detail.panelActions')">
          <div class="action-group">
            <h4 style="margin-top: 10px;">{{ t('tickets.detail.updateStatus') }}</h4>
            <Dropdown
              v-model="selectedStatus"
              :options="statusOptions"
              option-label="label"
              option-value="value"
              :placeholder="t('tickets.detail.selectStatus')"
              class="w-full"
              :disabled="!canUpdateStatus"
            />
          </div>

          <div class="action-group">
            <h4>{{ t('tickets.detail.updatePriority') }}</h4>
            <Dropdown
              v-model="selectedPriority"
              :options="priorityOptions"
              option-label="label"
              option-value="value"
              :placeholder="t('tickets.detail.selectPriority')"
              class="w-full"
              :disabled="!canUpdatePriority"
            />
          </div>

          <div class="action-group">
            <h4>{{ t('tickets.detail.assignAgent') }}</h4>
            <Dropdown
              v-model="selectedAgent"
              :options="agentOptions"
              option-label="label"
              option-value="value"
              :placeholder="t('tickets.detail.selectAgent')"
              class="w-full"
              :disabled="!canAssignAgent"
            />
          </div>

          <div class="action-group">
            <Button
              :label="t('common.saveChanges')"
              icon="pi pi-save"
              class="w-full"
              :disabled="!canSaveAny || !hasPendingChanges"
              :loading="ticketStore.isSaving"
              @click="saveChanges"
            />
          </div>

          <div v-if="canDeleteTicket" class="action-group">
            <h4>{{ t('tickets.detail.dangerZone') }}</h4>
            <Button
              :label="t('tickets.detail.deleteTicket')"
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
      <template #title>{{ t('tickets.detail.notFoundTitle') }}</template>
      <template #content>
        <p>{{ t('tickets.detail.notFoundDescription') }}</p>
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

.meta-grid > div {
  padding: 0.62rem 0.8rem;
  border: 1px solid #dbe5f1;
  border-radius: 10px;
  background: #f8fbff;
  color: #475569;
}

.meta-grid strong {
  color: #334155;
  margin-right: 0.25rem;
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
