<script setup>
import { reactive, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import Card from 'primevue/card'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Button from 'primevue/button'

import { useAuthStore } from '../stores/authStore'
import { roleRedirect } from '../services/authService'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const authStore = useAuthStore()

const form = reactive({
  email: '',
  password: '',
})

const isSubmitting = ref(false)

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

async function onSubmit() {
  if (!form.email || !form.password) {
    toast.add({
      severity: 'warn',
      summary: 'Missing fields',
      detail: 'Email and password are required.',
      life: 3000,
    })
    return
  }

  isSubmitting.value = true

  try {
    const user = await authStore.login(form.email, form.password)

    toast.add({
      severity: 'success',
      summary: 'Logged in',
      detail: 'Welcome back.',
      life: 2200,
    })

    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : null
    await router.push(redirect || roleRedirect(user?.role))
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Login failed',
      detail: extractErrorMessage(error, 'Unable to login.'),
      life: 4000,
    })
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <Card class="auth-card">
      <template #title>Login</template>
      <template #content>
        <form class="auth-form" @submit.prevent="onSubmit">
          <div class="field">
            <label for="email">Email</label>
            <InputText
              id="email"
              v-model="form.email"
              type="email"
              autocomplete="email"
              placeholder="you@example.com"
            />
          </div>

          <div class="field">
            <label for="password">Password</label>
            <Password
              id="password"
              v-model="form.password"
              :feedback="false"
              toggle-mask
              autocomplete="current-password"
              input-class="w-full"
              fluid
              placeholder="Enter your password"
            />
          </div>

          <Button type="submit" label="Login" :loading="isSubmitting" class="w-full" />
        </form>

        <p class="auth-link">
          No account yet?
          <RouterLink to="/register">Create one</RouterLink>
        </p>
      </template>
    </Card>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 1rem;
  background:
    radial-gradient(circle at 14% 12%, rgba(224, 242, 254, 0.72) 0%, transparent 40%),
    #ffffff;
}

.auth-card {
  width: 100%;
  max-width: 420px;
}

.auth-form {
  display: grid;
  gap: 1rem;
}

.field {
  display: grid;
  gap: 0.4rem;
}

.field label {
  color: #334155;
  font-weight: 600;
}

.field :deep(input) {
  width: 100%;
}

.auth-link {
  margin-top: 1rem;
  text-align: center;
  color: #64748b;
}

.auth-link a {
  color: #1d4ed8;
}

.w-full {
  width: 100%;
}

</style>
