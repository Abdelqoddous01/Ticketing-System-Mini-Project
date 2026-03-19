<script setup>
import { computed, onMounted, ref } from 'vue'
import { useToast } from 'primevue/usetoast'
import Card from 'primevue/card'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Dropdown from 'primevue/dropdown'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import ToggleButton from 'primevue/togglebutton'

import UserFormDialog from '../components/UserFormDialog.vue'
import {
  USER_ROLE_OPTIONS,
  createUser,
  deactivateUser,
  getUser,
  listUsers,
  updateUser,
} from '../services/userService'

const toast = useToast()

const users = ref([])
const isLoadingUsers = ref(false)
const isSubmittingForm = ref(false)
const roleFilter = ref(null)
const emailSearch = ref('')
const dialogVisible = ref(false)
const dialogMode = ref('create')
const selectedUser = ref(null)
const togglingUserIds = ref([])

const roleOptions = USER_ROLE_OPTIONS

const filteredUsers = computed(() => {
  const query = emailSearch.value.trim().toLowerCase()

  return users.value.filter((user) => {
    if (roleFilter.value && user.role !== roleFilter.value) {
      return false
    }

    if (!query) {
      return true
    }

    return String(user.email || '').toLowerCase().includes(query)
  })
})

function isTogglingUser(userId) {
  return togglingUserIds.value.includes(userId)
}

function setTogglingUser(userId, isToggling) {
  if (isToggling) {
    if (!togglingUserIds.value.includes(userId)) {
      togglingUserIds.value = [...togglingUserIds.value, userId]
    }
    return
  }

  togglingUserIds.value = togglingUserIds.value.filter((id) => id !== userId)
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

function roleSeverity(role) {
  if (role === 'admin') {
    return 'danger'
  }

  if (role === 'agent') {
    return 'warn'
  }

  return 'info'
}

function activeSeverity(isActive) {
  return isActive ? 'success' : 'secondary'
}

function upsertUser(updatedUser) {
  if (!updatedUser?.id) {
    return
  }

  const existingIndex = users.value.findIndex((user) => user.id === updatedUser.id)
  if (existingIndex === -1) {
    users.value = [updatedUser, ...users.value]
    return
  }

  users.value.splice(existingIndex, 1, {
    ...users.value[existingIndex],
    ...updatedUser,
  })
}

async function loadUsers() {
  isLoadingUsers.value = true

  try {
    const data = await listUsers()
    users.value = Array.isArray(data) ? data : []
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Failed to load users',
      detail: extractErrorMessage(error, 'Unable to fetch users.'),
      life: 4200,
    })
  } finally {
    isLoadingUsers.value = false
  }
}

function openCreateDialog() {
  dialogMode.value = 'create'
  selectedUser.value = null
  dialogVisible.value = true
}

function openEditDialog(user) {
  dialogMode.value = 'edit'
  selectedUser.value = user
  dialogVisible.value = true
}

async function onSubmitForm(payload) {
  isSubmittingForm.value = true

  try {
    if (dialogMode.value === 'create') {
      const createdUser = await createUser({
        email: payload.email,
        password: payload.password,
        role: payload.role,
      })
      upsertUser(createdUser)

      toast.add({
        severity: 'success',
        summary: 'User created',
        detail: `Created ${createdUser.email}.`,
        life: 2800,
      })
    } else if (selectedUser.value?.id) {
      const updatePayload = {
        email: payload.email,
        role: payload.role,
      }

      if (payload.password) {
        updatePayload.password = payload.password
      }

      const updatedUser = await updateUser(selectedUser.value.id, updatePayload)
      upsertUser(updatedUser)

      toast.add({
        severity: 'success',
        summary: 'User updated',
        detail: `Updated ${updatedUser.email}.`,
        life: 2800,
      })
    }

    dialogVisible.value = false
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: dialogMode.value === 'create' ? 'Create failed' : 'Update failed',
      detail: extractErrorMessage(error, 'Unable to save user changes.'),
      life: 4500,
    })
  } finally {
    isSubmittingForm.value = false
  }
}

async function onToggleIsActive(user, nextValue) {
  if (!user?.id || nextValue === user.is_active || isTogglingUser(user.id)) {
    return
  }

  setTogglingUser(user.id, true)

  try {
    if (nextValue) {
      const activatedUser = await updateUser(user.id, { is_active: true })
      upsertUser(activatedUser)

      toast.add({
        severity: 'success',
        summary: 'User activated',
        detail: `${activatedUser.email} is active again.`,
        life: 2600,
      })
    } else {
      await deactivateUser(user.id)
      const deactivatedUser = await getUser(user.id)
      upsertUser(deactivatedUser)

      toast.add({
        severity: 'warn',
        summary: 'User deactivated',
        detail: `${deactivatedUser.email} is now inactive.`,
        life: 2800,
      })
    }
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Status update failed',
      detail: extractErrorMessage(error, 'Unable to update user active status.'),
      life: 4500,
    })
  } finally {
    setTogglingUser(user.id, false)
  }
}

onMounted(loadUsers)
</script>

<template>
  <div class="admin-users-page">
    <Card>
      <template #content>
        <DataTable
          :value="filteredUsers"
          data-key="id"
          paginator
          :rows="10"
          :rows-per-page-options="[5, 10, 20, 50]"
          :loading="isLoadingUsers"
          striped-rows
          removable-sort
        >
          <template #header>
            <div class="table-header">
              <div class="table-left-controls">
                <InputText
                  v-model="emailSearch"
                  type="text"
                  placeholder="Search by email"
                  class="search-email"
                />
                <Dropdown
                  v-model="roleFilter"
                  :options="roleOptions"
                  option-label="label"
                  option-value="value"
                  placeholder="Filter by role"
                  show-clear
                  class="filter-select"
                />
              </div>

              <div class="table-right-controls">
                <Button
                  label="Refresh"
                  icon="pi pi-refresh"
                  severity="secondary"
                  :loading="isLoadingUsers"
                  @click="loadUsers"
                />
                <Button
                  label="Create User"
                  icon="pi pi-plus"
                  @click="openCreateDialog"
                />
              </div>
            </div>
          </template>

          <template #empty>
            No users found.
          </template>

          <Column field="email" header="Email" sortable />

          <Column field="role" header="Role" sortable>
            <template #body="{ data }">
              <Tag :value="data.role" :severity="roleSeverity(data.role)" />
            </template>
          </Column>

          <Column field="is_active" header="Status" sortable>
            <template #body="{ data }">
              <Tag
                :value="data.is_active ? 'Active' : 'Inactive'"
                :severity="activeSeverity(data.is_active)"
              />
            </template>
          </Column>

          <Column header="Active Toggle">
            <template #body="{ data }">
              <ToggleButton
                :model-value="data.is_active"
                on-label="Active"
                off-label="Inactive"
                on-icon="pi pi-check"
                off-icon="pi pi-times"
                :disabled="isTogglingUser(data.id)"
                @update:model-value="(value) => onToggleIsActive(data, value)"
              />
            </template>
          </Column>

          <Column header="Actions">
            <template #body="{ data }">
              <Button
                label="Edit User"
                icon="pi pi-pencil"
                text
                @click="openEditDialog(data)"
              />
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>

    <UserFormDialog
      v-model:visible="dialogVisible"
      :mode="dialogMode"
      :user="selectedUser"
      :submitting="isSubmittingForm"
      @submit="onSubmitForm"
    />
  </div>
</template>

<style scoped>
.admin-users-page {
  min-height: 100vh;
  padding: 2rem 1rem;
}

.table-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  flex-wrap: wrap;
}

.table-left-controls {
  display: flex;
  align-items: center;
  gap: 0.8rem;
}

.table-right-controls {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.filter-select {
  min-width: 220px;
}

.search-email {
  min-width: 240px;
}
</style>
