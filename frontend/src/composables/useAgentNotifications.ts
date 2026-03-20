import { onBeforeUnmount, ref, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useI18n } from 'vue-i18n'

import { useAuthStore } from '../stores/authStore'
import {
  buildNotificationsSocketUrl,
  listUnreadNotifications,
  markNotificationAsRead,
  type TicketAssignmentNotification,
} from '../services/notificationService'

const MAX_NOTIFICATION_RECONNECT_DELAY_MS = 10000

interface NotificationSocketMessage {
  type?: string
  payload?: TicketAssignmentNotification
}

export function useAgentNotifications(): void {
  const authStore = useAuthStore()
  const toast = useToast()
  const { t } = useI18n()

  const notificationSocket = ref<WebSocket | null>(null)
  const notificationReconnectTimer = ref<number | null>(null)
  const notificationReconnectAttempts = ref(0)
  const shouldReconnectNotifications = ref(false)
  const unreadLoadedForUserId = ref<number | null>(null)
  const seenNotificationIds = new Set<string>()

  function clearNotificationReconnectTimer(): void {
    if (notificationReconnectTimer.value === null) {
      return
    }

    window.clearTimeout(notificationReconnectTimer.value)
    notificationReconnectTimer.value = null
  }

  function closeNotificationSocket(disableReconnect = true): void {
    clearNotificationReconnectTimer()

    if (disableReconnect) {
      shouldReconnectNotifications.value = false
      notificationReconnectAttempts.value = 0
    }

    if (!notificationSocket.value) {
      return
    }

    notificationSocket.value.onopen = null
    notificationSocket.value.onmessage = null
    notificationSocket.value.onerror = null
    notificationSocket.value.onclose = null

    if (
      notificationSocket.value.readyState === WebSocket.OPEN ||
      notificationSocket.value.readyState === WebSocket.CONNECTING
    ) {
      notificationSocket.value.close(1000, 'socket-reset')
    }

    notificationSocket.value = null
  }

  function scheduleNotificationReconnect(): void {
    if (!shouldReconnectNotifications.value || notificationReconnectTimer.value !== null) {
      return
    }

    const backoffDelay = Math.min(
      1000 * 2 ** notificationReconnectAttempts.value,
      MAX_NOTIFICATION_RECONNECT_DELAY_MS,
    )
    notificationReconnectAttempts.value += 1

    notificationReconnectTimer.value = window.setTimeout(() => {
      notificationReconnectTimer.value = null
      openNotificationSocket()
    }, backoffDelay)
  }

  function notificationDetail(notification: TicketAssignmentNotification): string {
    if (notification.ticket_title) {
      return t('notifications.ticketAssigned.detailWithTitle', {
        ticketId: notification.ticket,
        ticketTitle: notification.ticket_title,
      })
    }

    return t('notifications.ticketAssigned.detail', {
      ticketId: notification.ticket,
    })
  }

  async function displayAssignmentNotification(notification: TicketAssignmentNotification): Promise<void> {
    if (notification.event_type !== 'ticket_assigned') {
      return
    }

    const notificationId = Number(notification.id)
    if (!Number.isInteger(notificationId)) {
      return
    }

    const dedupeKey = String(notificationId)
    if (seenNotificationIds.has(dedupeKey)) {
      return
    }

    seenNotificationIds.add(dedupeKey)

    toast.add({
      severity: 'info',
      summary: t('notifications.ticketAssigned.summary'),
      detail: notificationDetail(notification),
      life: 5200,
    })

    if (!notification.is_read) {
      try {
        await markNotificationAsRead(notificationId)
      } catch {
        // Keep the toast flow non-blocking if the read acknowledgement fails.
      }
    }
  }

  function handleNotificationSocketMessage(rawData: string): void {
    let data: NotificationSocketMessage

    try {
      data = JSON.parse(rawData) as NotificationSocketMessage
    } catch {
      return
    }

    if (data.type !== 'notification.created' || !data.payload) {
      return
    }

    void displayAssignmentNotification(data.payload)
  }

  function openNotificationSocket(): void {
    if (!authStore.accessToken) {
      return
    }

    clearNotificationReconnectTimer()

    if (notificationSocket.value) {
      notificationSocket.value.close(1000, 'socket-reconnect')
      notificationSocket.value = null
    }

    const socket = new WebSocket(buildNotificationsSocketUrl(authStore.accessToken))
    notificationSocket.value = socket

    socket.onopen = () => {
      notificationReconnectAttempts.value = 0
    }

    socket.onmessage = (event) => {
      handleNotificationSocketMessage(event.data)
    }

    socket.onerror = () => {}

    socket.onclose = (event) => {
      if (notificationSocket.value === socket) {
        notificationSocket.value = null
      }

      if (!shouldReconnectNotifications.value) {
        return
      }

      if ([4401, 4403].includes(event.code)) {
        shouldReconnectNotifications.value = false
        return
      }

      if (event.code === 1000) {
        return
      }

      scheduleNotificationReconnect()
    }
  }

  async function loadUnreadNotifications(userId: number): Promise<void> {
    try {
      const unreadNotifications = await listUnreadNotifications()

      if (Array.isArray(unreadNotifications)) {
        for (const notification of unreadNotifications) {
          await displayAssignmentNotification(notification)
        }
      }

      unreadLoadedForUserId.value = userId
    } catch {
      // Avoid noisy toasts for transient notification bootstrap errors.
    }
  }

  watch(
    () => ({
      isAuthenticated: authStore.isAuthenticated,
      accessToken: authStore.accessToken,
      userId: authStore.user?.id ?? null,
      role: authStore.user?.role ?? null,
    }),
    async ({ isAuthenticated, accessToken, userId, role }) => {
      const normalizedUserId = Number.isInteger(userId) ? userId : null
      const shouldEnableNotifications = Boolean(
        isAuthenticated && accessToken && normalizedUserId !== null && role === 'agent',
      )

      if (!shouldEnableNotifications) {
        closeNotificationSocket()
        unreadLoadedForUserId.value = null
        seenNotificationIds.clear()
        return
      }

      if (unreadLoadedForUserId.value !== normalizedUserId) {
        seenNotificationIds.clear()
      }

      shouldReconnectNotifications.value = true
      openNotificationSocket()

      if (normalizedUserId !== null && unreadLoadedForUserId.value !== normalizedUserId) {
        await loadUnreadNotifications(normalizedUserId)
      }
    },
    { immediate: true },
  )

  onBeforeUnmount(() => {
    closeNotificationSocket()
  })
}
