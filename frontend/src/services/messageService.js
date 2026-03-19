import { apiClient } from './http'

function ticketMessagesPath(ticketId) {
  return `/api/tickets/${ticketId}/messages/`
}

export async function getTicketMessages(ticketId) {
  const { data } = await apiClient.get(ticketMessagesPath(ticketId))
  return data
}

export async function sendTicketMessage(ticketId, payload) {
  const { data } = await apiClient.post(ticketMessagesPath(ticketId), payload)
  return data
}
