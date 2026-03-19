import { apiClient } from './http'

const TICKETS_ENDPOINT = '/api/tickets/'
const USERS_ENDPOINT = '/api/users/'

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed'
export type TicketPriority = 'low' | 'medium' | 'high'

export interface Ticket {
  id: number
  title: string
  description: string
  status: TicketStatus
  priority: TicketPriority
  created_by: number
  assigned_to: number | null
  created_at: string
  updated_at: string
}

export interface TicketMessage {
  id: number
  ticket: number
  author: number
  author_email?: string
  author_role?: 'customer' | 'agent' | 'admin'
  body: string
  created_at: string
}

export type TicketCreatePayload = Pick<Ticket, 'title' | 'description'>
export type TicketUpdatePayload = Partial<
  Pick<Ticket, 'title' | 'description' | 'status' | 'priority' | 'assigned_to'>
>

export interface TicketUser {
  id: number
  email: string
  role: 'customer' | 'agent' | 'admin'
  first_name?: string
  last_name?: string
  is_active?: boolean
}

interface Option<T> {
  label: string
  value: T
}

export const TICKET_STATUS_OPTIONS: Option<TicketStatus>[] = [
  { label: 'Open', value: 'open' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Resolved', value: 'resolved' },
  { label: 'Closed', value: 'closed' },
]

export const TICKET_PRIORITY_OPTIONS: Option<TicketPriority>[] = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
]

interface TicketListParams {
  [key: string]: string | number | boolean | null | undefined
}

function ticketPath(id: number | string = ''): string {
  return `${TICKETS_ENDPOINT}${id ? `${id}/` : ''}`
}

export async function listTickets(params: TicketListParams = {}): Promise<Ticket[]> {
  const { data } = await apiClient.get<Ticket[]>(ticketPath(), { params })
  return data
}

export async function getTicket(id: number | string): Promise<Ticket> {
  const { data } = await apiClient.get<Ticket>(ticketPath(id))
  return data
}

export async function createTicket(payload: TicketCreatePayload): Promise<Ticket> {
  const { data } = await apiClient.post<Ticket>(ticketPath(), payload)
  return data
}

export async function updateTicket(id: number | string, payload: TicketUpdatePayload): Promise<Ticket> {
  const { data } = await apiClient.patch<Ticket>(ticketPath(id), payload)
  return data
}

export async function updateTicketStatus(
  id: number | string,
  status: TicketStatus,
): Promise<Record<string, unknown>> {
  const { data } = await apiClient.patch<Record<string, unknown>>(`${ticketPath(id)}status/`, { status })
  return data
}

export async function updateTicketPriority(
  id: number | string,
  priority: TicketPriority,
): Promise<Record<string, unknown>> {
  const { data } = await apiClient.patch<Record<string, unknown>>(`${ticketPath(id)}priority/`, {
    priority,
  })
  return data
}

export async function assignTicket(
  id: number | string,
  userId: number | null,
): Promise<Record<string, unknown>> {
  const { data } = await apiClient.patch<Record<string, unknown>>(`${ticketPath(id)}assign/`, {
    user_id: userId,
  })
  return data
}

export async function deleteTicket(id: number | string): Promise<void> {
  await apiClient.delete(ticketPath(id))
}

export async function getTicketMessages(id: number | string): Promise<TicketMessage[]> {
  const { data } = await apiClient.get<TicketMessage[]>(`${ticketPath(id)}messages/`)
  return data
}

export async function listUsers(): Promise<TicketUser[]> {
  const { data } = await apiClient.get<TicketUser[]>(USERS_ENDPOINT)
  return data
}
