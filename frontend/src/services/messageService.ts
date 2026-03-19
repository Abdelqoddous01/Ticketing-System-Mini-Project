import { apiClient } from './http'
import type { TicketMessage } from './ticketService'

export interface TicketMessageCreatePayload {
  body: string
}

function ticketMessagesPath(ticketId: number | string): string {
  return `/api/tickets/${ticketId}/messages/`
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
