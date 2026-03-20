import { apiClient, API_BASE_URL } from './http'

export type NotificationEventType = 'ticket_assigned'

export interface TicketAssignmentNotification {
  id: number
  event_type: NotificationEventType
  ticket: number
  ticket_title?: string | null
  assigned_by: number | null
  assigned_by_email?: string | null
  is_read: boolean
  created_at: string
}

export function buildNotificationsSocketUrl(accessToken: string): string {
  const baseUrl = new URL(API_BASE_URL, window.location.origin)
  baseUrl.protocol = baseUrl.protocol === 'https:' ? 'wss:' : 'ws:'
  baseUrl.pathname = '/ws/notifications/'
  baseUrl.search = ''
  baseUrl.searchParams.set('token', accessToken)
  return baseUrl.toString()
}

export async function listUnreadNotifications(): Promise<TicketAssignmentNotification[]> {
  const { data } = await apiClient.get<TicketAssignmentNotification[]>('/api/notifications/unread/')
  return data
}

export async function markNotificationAsRead(
  notificationId: number | string,
): Promise<TicketAssignmentNotification> {
  const { data } = await apiClient.post<TicketAssignmentNotification>(
    `/api/notifications/${notificationId}/read/`,
  )
  return data
}
