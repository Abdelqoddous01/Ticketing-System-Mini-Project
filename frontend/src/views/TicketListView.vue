<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import Card from 'primevue/card'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import InputText from 'primevue/inputtext'
import Dropdown from 'primevue/dropdown'
import { useI18n } from 'vue-i18n'

import { useAuthStore } from '../stores/authStore'
import { useTicketStore } from '../stores/ticketStore'
import StatusBadge from '../components/StatusBadge.vue'
import PriorityBadge from '../components/PriorityBadge.vue'
import { TICKET_PRIORITY_OPTIONS, TICKET_STATUS_OPTIONS } from '../services/ticketService'

const router = useRouter()
const toast = useToast()
const authStore = useAuthStore()
const ticketStore = useTicketStore()
const { t, locale } = useI18n()

const searchTerm = ref('')
const selectedStatusFilter = ref(null)
const selectedPriorityFilter = ref(null)

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

const isCustomer = computed(() => authStore.user?.role === 'customer')

const tableRows = computed(() =>
  ticketStore.tickets.map((ticket) => ({
    ...ticket,
    assigned_label: formatAssignedTo(ticket.assigned_to, ticket.assigned_to_email),
  })),
)

const filteredRows = computed(() => {
  const query = searchTerm.value.trim().toLowerCase()

  return tableRows.value.filter((ticket) => {
    if (selectedStatusFilter.value && ticket.status !== selectedStatusFilter.value) {
      return false
    }

    if (selectedPriorityFilter.value && ticket.priority !== selectedPriorityFilter.value) {
      return false
    }

    if (!query) {
      return true
    }

    return [
      ticket.title,
      ticket.status,
      ticket.priority,
      ticket.assigned_label,
      String(ticket.created_at),
    ]
      .join(' ')
      .toLowerCase()
      .includes(query)
  })
})

function formatAssignedTo(assignedTo, assignedToEmail) {
  if (!assignedTo) {
    return t('common.unassigned')
  }

  return assignedToEmail || t('tickets.list.assignedAgent', { id: assignedTo })
}

function formatDate(value) {
  if (!value) {
    return '-'
  }

  return new Date(value).toLocaleString(locale.value)
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

  if (typeof error?.message === 'string') {
    return error.message
  }

  return fallback
}

async function loadTickets() {
  try {
    await ticketStore.fetchTickets()
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: t('tickets.list.toast.loadFailedSummary'),
      detail: extractErrorMessage(error, t('tickets.list.toast.loadFailedDetail')),
      life: 4200,
    })
  }
}

function goToCreate() {
  router.push('/tickets/create')
}

function goToDetail(ticketId) {
  router.push(`/tickets/${ticketId}`)
}

onMounted(loadTickets)
</script>

<template>
  <div class="tickets-page">
    <Card class="users-table-card">
      <template #content>
        <DataTable
          :value="filteredRows"
          data-key="id"
          paginator
          :rows="10"
          :rows-per-page-options="[5, 10, 20, 50]"
          :loading="ticketStore.isLoadingList"
          striped-rows
          removable-sort
        >
          <template #header>
            <div class="table-header">
              <div class="table-left-controls">
                <div class="table-search">
                  <i class="pi pi-search search-icon" />
                  <InputText
                    v-model="searchTerm"
                    :placeholder="t('tickets.list.searchPlaceholder')"
                    class="search-input"
                  />
                </div>

                <Dropdown
                  v-model="selectedStatusFilter"
                  :options="statusOptions"
                  option-label="label"
                  option-value="value"
                  :placeholder="t('tickets.list.filterStatus')"
                  show-clear
                  class="filter-select"
                />
                <Dropdown
                  v-model="selectedPriorityFilter"
                  :options="priorityOptions"
                  option-label="label"
                  option-value="value"
                  :placeholder="t('tickets.list.filterPriority')"
                  show-clear
                  class="filter-select"
                />
              </div>

              <div class="table-right-controls">
                <Button
                  :label="t('common.refresh')"
                  icon="pi pi-refresh"
                  severity="secondary"
                  :loading="ticketStore.isLoadingList"
                  @click="loadTickets"
                />
                <Button
                  v-if="isCustomer"
                  :label="t('tickets.list.create')"
                  icon="pi pi-plus"
                  @click="goToCreate"
                />
              </div>
            </div>
          </template>

          <template #empty>
            {{ t('tickets.list.empty') }}
          </template>

          <Column field="title" :header="t('tickets.list.columnTitle')" sortable>
            <template #body="{ data }">
              <Button
                :label="data.title"
                text
                class="ticket-link"
                @click="goToDetail(data.id)"
              />
            </template>
          </Column>

          <Column field="status" :header="t('tickets.list.columnStatus')" sortable>
            <template #body="{ data }">
              <StatusBadge :value="data.status" />
            </template>
          </Column>

          <Column field="priority" :header="t('tickets.list.columnPriority')" sortable>
            <template #body="{ data }">
              <PriorityBadge :value="data.priority" />
            </template>
          </Column>

          <Column field="assigned_label" :header="t('tickets.list.columnAssignedTo')" sortable>
            <template #body="{ data }">
              {{ data.assigned_label }}
            </template>
          </Column>

          <Column field="created_at" :header="t('tickets.list.columnCreatedAt')" sortable>
            <template #body="{ data }">
              {{ formatDate(data.created_at) }}
            </template>
          </Column>

          <Column :header="t('common.actions')">
            <template #body="{ data }">
              <Button
                :label="t('tickets.list.view')"
                icon="pi pi-arrow-right"
                text
                @click="goToDetail(data.id)"
              />
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>
  </div>
</template>

<style scoped>
.tickets-page {
  min-height: 100vh;
  padding: 2rem 1rem;
}

.table-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  flex-wrap: nowrap;
  overflow-x: auto;
  padding-bottom: 0.2rem;
  white-space: nowrap;
}

.table-left-controls {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  flex-wrap: nowrap;
}

.table-search {
  position: relative;
  display: flex;
  align-items: center;
  width: 360px;
  flex: 0 0 360px;
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  color: #6b7280;
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding-left: 2.2rem;
}

.filter-select {
  min-width: 180px;
}

.table-right-controls {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-left: auto;
}

.ticket-link {
  padding-left: 0;
}

.users-table-card :deep(.p-card-body),
.users-table-card :deep(.p-card-content) {
  padding: 0;
}
</style>
