import axios, { type AxiosError, type InternalAxiosRequestConfig, type AxiosResponse } from 'axios'
import type { Router } from 'vue-router'
import type { Pinia } from 'pinia'

import { useAuthStore } from '../stores/authStore'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

const AUTH_ENDPOINTS = [
  '/api/auth/login/',
  '/api/auth/register/',
  '/api/auth/token/refresh/',
  '/api/auth/logout/',
]

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

interface SessionExpiredEventDetail {
  message: string
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

let piniaInstance: Pinia | null = null
let routerInstance: Router | null = null
let refreshPromise: Promise<string> | null = null
let initialized = false

function isAuthEndpoint(url = ''): boolean {
  return AUTH_ENDPOINTS.some((path) => url.includes(path))
}

function notifySessionExpired(message = 'Session expired, please log in again.'): void {
  window.dispatchEvent(
    new CustomEvent<SessionExpiredEventDetail>('auth:session-expired', {
      detail: { message },
    }),
  )
}

async function forceLogout(): Promise<void> {
  if (!piniaInstance) {
    return
  }

  const authStore = useAuthStore(piniaInstance)
  authStore.clearSession()

  if (routerInstance && routerInstance.currentRoute.value.path !== '/login') {
    await routerInstance.push('/login')
  }
}

interface SetupInterceptorsOptions {
  pinia: Pinia
  router: Router
}

export function setupHttpInterceptors({ pinia, router }: SetupInterceptorsOptions): void {
  if (initialized) {
    return
  }

  piniaInstance = pinia
  routerInstance = router

  apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    if (!piniaInstance) {
      return config
    }

    const authStore = useAuthStore(piniaInstance)
    if (authStore.accessToken) {
      config.headers.Authorization = `Bearer ${authStore.accessToken}`
    }

    return config
  })

  apiClient.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as RetryableRequestConfig | undefined
      const status = error.response?.status

      if (status !== 401 || !originalRequest) {
        return Promise.reject(error)
      }

      const requestUrl = originalRequest.url || ''
      if (originalRequest._retry || isAuthEndpoint(requestUrl)) {
        return Promise.reject(error)
      }

      if (!piniaInstance) {
        return Promise.reject(error)
      }

      const authStore = useAuthStore(piniaInstance)
      if (!authStore.refreshToken) {
        notifySessionExpired()
        await forceLogout()
        return Promise.reject(error)
      }

      originalRequest._retry = true

      try {
        if (!refreshPromise) {
          refreshPromise = authStore.refreshAccessToken().finally(() => {
            refreshPromise = null
          })
        }

        await refreshPromise

        originalRequest.headers.Authorization = `Bearer ${authStore.accessToken}`

        return apiClient(originalRequest)
      } catch (refreshError) {
        notifySessionExpired()
        await forceLogout()
        return Promise.reject(refreshError)
      }
    },
  )

  initialized = true
}
