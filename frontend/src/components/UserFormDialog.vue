<script setup>
import { computed, reactive, watch } from 'vue'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Dropdown from 'primevue/dropdown'
import Button from 'primevue/button'

import { USER_ROLE_OPTIONS } from '../services/userService'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  mode: {
    type: String,
    default: 'create',
  },
  user: {
    type: Object,
    default: null,
  },
  submitting: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:visible', 'submit'])

const form = reactive({
  email: '',
  password: '',
  role: 'customer',
})

const errors = reactive({
  email: '',
  password: '',
})

const roleOptions = USER_ROLE_OPTIONS

const isEditMode = computed(() => props.mode === 'edit')
const dialogTitle = computed(() => (isEditMode.value ? 'Edit User' : 'Create User'))
const submitLabel = computed(() => (isEditMode.value ? 'Save User' : 'Create User'))

const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value),
})

watch(
  () => [props.visible, props.mode, props.user],
  () => {
    if (!props.visible) {
      return
    }

    form.email = props.user?.email || ''
    form.password = ''
    form.role = props.user?.role || 'customer'
    errors.email = ''
    errors.password = ''
  },
  { immediate: true },
)

function validate() {
  errors.email = ''
  errors.password = ''

  if (!form.email.trim()) {
    errors.email = 'Email is required.'
    return false
  }

  if (!form.password && !isEditMode.value) {
    errors.password = 'Password is required.'
    return false
  }

  if (form.password && form.password.length < 8) {
    errors.password = 'Password must be at least 8 characters.'
    return false
  }

  return true
}

function onSubmit() {
  if (!validate()) {
    return
  }

  emit('submit', {
    email: form.email.trim(),
    password: form.password,
    role: form.role,
  })
}
</script>

<template>
  <Dialog
    v-model:visible="dialogVisible"
    modal
    :header="dialogTitle"
    :style="{ width: '32rem', maxWidth: '95vw' }"
  >
    <form class="user-form" @submit.prevent="onSubmit">
      <div class="field">
        <label for="user-email">Email</label>
        <InputText
          id="user-email"
          v-model="form.email"
          type="email"
          placeholder="name@example.com"
          autocomplete="off"
        />
        <small v-if="errors.email" class="field-error">{{ errors.email }}</small>
      </div>

      <div class="field">
        <label for="user-password">Password</label>
        <InputText
          id="user-password"
          v-model="form.password"
          type="password"
          :placeholder="isEditMode ? 'Leave blank to keep current password' : 'At least 8 characters'"
          :autocomplete="isEditMode ? 'current-password' : 'new-password'"
        />
        <small v-if="errors.password" class="field-error">{{ errors.password }}</small>
      </div>

      <div class="field">
        <label for="user-role">Role</label>
        <Dropdown
          id="user-role"
          v-model="form.role"
          :options="roleOptions"
          option-label="label"
          option-value="value"
          placeholder="Select role"
        />
      </div>
    </form>

    <template #footer>
      <Button
        label="Cancel"
        severity="secondary"
        text
        @click="dialogVisible = false"
      />
      <Button
        :label="submitLabel"
        icon="pi pi-check"
        :loading="submitting"
        @click="onSubmit"
      />
    </template>
  </Dialog>
</template>

<style scoped>
.user-form {
  display: grid;
  gap: 1rem;
}

.field {
  display: grid;
  gap: 0.4rem;
}

.field :deep(input),
.field :deep(.p-dropdown) {
  width: 100%;
}

.field-error {
  color: #dc2626;
}
</style>
