<script setup>
import { reactive, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import Card from 'primevue/card'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Button from 'primevue/button'
import { useI18n } from 'vue-i18n'

import { useAuthStore } from '../stores/authStore'
import { roleRedirect } from '../services/authService'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const authStore = useAuthStore()
const { t } = useI18n()

const form = reactive({
  email: '',
  password: '',
  confirmPassword: '',
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

async function onSubmit() {
  if (!form.email || !form.password || !form.confirmPassword) {
    toast.add({
      severity: 'warn',
      summary: t('auth.register.toast.missingFieldsSummary'),
      detail: t('auth.register.toast.missingFieldsDetail'),
      life: 3000,
    })
    return
  }

  if (form.password !== form.confirmPassword) {
    toast.add({
      severity: 'error',
      summary: t('auth.register.toast.validationSummary'),
      detail: t('auth.register.toast.passwordMismatch'),
      life: 3500,
    })
    return
  }

  isSubmitting.value = true

  try {
    const user = await authStore.register(form.email, form.password, form.confirmPassword)

    toast.add({
      severity: 'success',
      summary: t('auth.register.toast.successSummary'),
      detail: t('auth.register.toast.successDetail'),
      life: 2500,
    })

    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : null
    await router.push(redirect || roleRedirect(user?.role))
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: t('auth.register.toast.failedSummary'),
      detail: extractErrorMessage(error, t('auth.register.toast.failedDetail')),
      life: 4500,
    })
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <Card class="auth-card">
      <template #title>{{ t('auth.register.cardTitle') }}</template>
      <template #content>
        <form class="auth-form" @submit.prevent="onSubmit">
          <div class="field">
            <label for="email">{{ t('auth.register.emailLabel') }}</label>
            <InputText
              id="email"
              v-model="form.email"
              type="email"
              autocomplete="email"
              placeholder="you@example.com"
            />
          </div>

          <div class="field">
            <label for="password">{{ t('auth.register.passwordLabel') }}</label>
            <Password
              id="password"
              v-model="form.password"
              :feedback="false"
              toggle-mask
              autocomplete="new-password"
              input-class="w-full"
              fluid
              :placeholder="t('auth.register.passwordPlaceholder')"
            />
          </div>

          <div class="field">
            <label for="confirm-password">{{ t('auth.register.confirmPasswordLabel') }}</label>
            <Password
              id="confirm-password"
              v-model="form.confirmPassword"
              :feedback="false"
              toggle-mask
              autocomplete="new-password"
              input-class="w-full"
              fluid
              :placeholder="t('auth.register.confirmPasswordPlaceholder')"
            />
          </div>

          <Button type="submit" :label="t('auth.register.submit')" :loading="isSubmitting" class="w-full" />
        </form>

        <p class="auth-link">
          {{ t('auth.register.alreadyRegistered') }}
          <RouterLink to="/login">{{ t('auth.register.login') }}</RouterLink>
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
