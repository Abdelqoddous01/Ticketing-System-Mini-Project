import { defineStore } from 'pinia'
import type { AxiosError } from 'axios'
import * as ticketService from '../services/ticketService'

interface TicketState {
  tickets: ticketService.Ticket[]
  selectedTicket: ticketService.Ticket | null
  messages: ticketService.TicketMessage[]
  agents: ticketService.TicketUser[]
  isLoadingList: boolean
  isLoadingTicket: boolean
  isLoadingMessages: boolean
  isSaving: boolean
}

function isForbiddenError(error: unknown): boolean {
  const axiosError = error as AxiosError | undefined
  return axiosError?.response?.status === 403
}

export const useTicketStore = defineStore('tickets', {
  state: (): TicketState => ({
    tickets: [],
    selectedTicket: null,
    messages: [],
    agents: [],
    isLoadingList: false,
    isLoadingTicket: false,
    isLoadingMessages: false,
    isSaving: false,
  }),

  actions: {
    setTicketInCollection(ticket: ticketService.Ticket): void {
      if (!ticket?.id) {
        return
      }

      const index = this.tickets.findIndex((item) => item.id === ticket.id)

      if (index === -1) {
        this.tickets = [ticket, ...this.tickets]
        return
      }

      this.tickets.splice(index, 1, ticket)
    },

    removeTicketFromCollection(id: number): void {
      this.tickets = this.tickets.filter((ticket) => ticket.id !== id)
    },

    async fetchTickets(): Promise<ticketService.Ticket[]> {
      this.isLoadingList = true

      try {
        this.tickets = await ticketService.listTickets()
        return this.tickets
      } finally {
        this.isLoadingList = false
      }
    },

    async fetchTicket(id: number): Promise<ticketService.Ticket | null> {
      this.isLoadingTicket = true

      try {
        const data = await ticketService.getTicket(id)
        this.selectedTicket = data || null

        if (data) {
          this.setTicketInCollection(data)
        }

        return this.selectedTicket
      } finally {
        this.isLoadingTicket = false
      }
    },

    async fetchTicketMessages(id: number): Promise<ticketService.TicketMessage[]> {
      this.isLoadingMessages = true

      try {
        this.messages = await ticketService.getTicketMessages(id)
        return this.messages
      } finally {
        this.isLoadingMessages = false
      }
    },

    async createTicket(payload: ticketService.TicketCreatePayload): Promise<ticketService.Ticket> {
      this.isSaving = true

      try {
        const data = await ticketService.createTicket(payload)
        if (data) {
          this.setTicketInCollection(data)
        }
        return data
      } finally {
        this.isSaving = false
      }
    },

    async updateTicket(
      id: number,
      payload: ticketService.TicketUpdatePayload,
    ): Promise<ticketService.Ticket> {
      this.isSaving = true

      try {
        const data = await ticketService.updateTicket(id, payload)
        if (data) {
          this.selectedTicket = data
          this.setTicketInCollection(data)
        }
        return data
      } finally {
        this.isSaving = false
      }
    },

    async updateTicketStatus(
      id: number,
      status: ticketService.TicketStatus,
    ): Promise<ticketService.Ticket | null> {
      this.isSaving = true

      try {
        try {
          await ticketService.updateTicketStatus(id, status)
        } catch (error: unknown) {
          if (!isForbiddenError(error)) {
            throw error
          }

          await ticketService.updateTicket(id, { status })
        }

        return this.fetchTicket(id)
      } finally {
        this.isSaving = false
      }
    },

    async updateTicketPriority(
      id: number,
      priority: ticketService.TicketPriority,
    ): Promise<ticketService.Ticket | null> {
      this.isSaving = true

      try {
        await ticketService.updateTicketPriority(id, priority)
        return this.fetchTicket(id)
      } finally {
        this.isSaving = false
      }
    },

    async assignTicket(id: number, userId: number | null): Promise<ticketService.Ticket | null> {
      this.isSaving = true

      try {
        await ticketService.assignTicket(id, userId)
        return this.fetchTicket(id)
      } finally {
        this.isSaving = false
      }
    },

    async deleteTicket(id: number): Promise<void> {
      this.isSaving = true

      try {
        await ticketService.deleteTicket(id)
        this.removeTicketFromCollection(id)

        if (this.selectedTicket?.id === id) {
          this.selectedTicket = null
          this.messages = []
        }
      } finally {
        this.isSaving = false
      }
    },

    async fetchAgents(): Promise<ticketService.TicketUser[]> {
      const data = await ticketService.listUsers()
      this.agents = data.filter((user) => user.role === 'agent')
      return this.agents
    },
  },
})
