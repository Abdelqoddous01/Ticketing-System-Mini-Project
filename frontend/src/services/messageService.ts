import { apiClient, API_BASE_URL } from './http'
import type { TicketMessage } from './ticketService'

export interface TicketMessageCreatePayload {
  body: string
}

function ticketMessagesPath(ticketId: number | string): string {
  return `/api/tickets/${ticketId}/messages/`
}

export function buildTicketMessagesSocketUrl(
  ticketId: number | string,
  accessToken: string,
): string {
  const baseUrl = new URL(API_BASE_URL, window.location.origin)
  baseUrl.protocol = baseUrl.protocol === 'https:' ? 'wss:' : 'ws:'
  baseUrl.pathname = `/ws/tickets/${ticketId}/messages/`
  baseUrl.search = ''
  baseUrl.searchParams.set('token', accessToken)
  return baseUrl.toString()
}

export async function getTicketMessages(ticketId: number | string): Promise<TicketMessage[]> {
  const { data } = await apiClient.get<TicketMessage[]>(ticketMessagesPath(ticketId))
  return data
}

export async function sendTicketMessage(
  ticketId: number | string,
  payload: TicketMessageCreatePayload,
): Promise<TicketMessage> {
  const { data } = await apiClient.post<TicketMessage>(ticketMessagesPath(ticketId), payload)
  return data
}
