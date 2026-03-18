import { defineStore } from 'pinia'
import * as authService from '../services/authService'
import type { AuthUser } from '../services/authService'

const ACCESS_TOKEN_KEY = 'auth_access_token'
const REFRESH_TOKEN_KEY = 'auth_refresh_token'
const USER_KEY = 'auth_user'

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: AuthUser | null
  isAuthenticated: boolean
  isRefreshing: boolean
  isInitialized: boolean
}

interface SessionPayload {
  access: string
  refresh: string
  user: AuthUser | null
}

function parseStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    localStorage.removeItem(USER_KEY)
    return null
  }
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    accessToken: null,
    refreshToken: null,
    user: null,
    isAuthenticated: false,
    isRefreshing: false,
    isInitialized: false,
  }),

  actions: {
    initializeAuth(): void {
      if (this.isInitialized) {
        return
      }

      const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY)
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
      const user = parseStoredUser()

      if (accessToken && refreshToken) {
        this.accessToken = accessToken
        this.refreshToken = refreshToken
        this.user = user
        this.isAuthenticated = true
      } else {
        this.clearSession()
      }

      this.isInitialized = true
    },

    setSession({ access, refresh, user }: SessionPayload): void {
      this.accessToken = access
      this.refreshToken = refresh
      this.user = user
      this.isAuthenticated = Boolean(access && refresh)

      localStorage.setItem(ACCESS_TOKEN_KEY, access)
      localStorage.setItem(REFRESH_TOKEN_KEY, refresh)

      if (user) {
        localStorage.setItem(USER_KEY, JSON.stringify(user))
      } else {
        localStorage.removeItem(USER_KEY)
      }
    },

    clearSession(): void {
      this.accessToken = null
      this.refreshToken = null
      this.user = null
      this.isAuthenticated = false
      this.isRefreshing = false

      localStorage.removeItem(ACCESS_TOKEN_KEY)
      localStorage.removeItem(REFRESH_TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
    },

    async login(email: string, password: string): Promise<AuthUser> {
      const payload = {
        email: email.trim(),
        password,
      }

      const data = await authService.login(payload)

      if (!data?.access || !data?.refresh) {
        throw new Error('Invalid login response: missing tokens.')
      }

      if (!data?.user?.role) {
        throw new Error('Invalid login response: missing user role.')
      }

      this.setSession({
        access: data.access,
        refresh: data.refresh,
        user: data.user,
      })

      return data.user
    },

    async register(email: string, password: string, confirmPassword: string): Promise<AuthUser> {
      if (password !== confirmPassword) {
        throw new Error('Passwords do not match.')
      }

      await authService.register({
        email: email.trim(),
        password,
      })

      return this.login(email, password)
    },

    async refreshAccessToken(): Promise<string> {
      if (!this.refreshToken) {
        throw new Error('Missing refresh token.')
      }

      this.isRefreshing = true

      try {
        const data = await authService.refreshToken(this.refreshToken)

        if (!data?.access) {
          throw new Error('Invalid refresh response: missing access token.')
        }

        this.accessToken = data.access
        this.isAuthenticated = true
        localStorage.setItem(ACCESS_TOKEN_KEY, data.access)

        return data.access
      } finally {
        this.isRefreshing = false
      }
    },

    async logout(): Promise<void> {
      const refresh = this.refreshToken

      try {
        if (refresh) {
          await authService.logout(refresh)
        }
      } finally {
        this.clearSession()
      }
    },
  },
})
