import { apiClient } from './http'

export type UserRole = 'customer' | 'agent' | 'admin'

export interface AuthUser {
  id: number
  email: string
  role: UserRole
  first_name?: string
  last_name?: string
  is_active?: boolean
}

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  email: string
  password: string
}

export interface LoginResponse {
  access: string
  refresh: string
  user: AuthUser
}

export interface RefreshResponse {
  access: string
}

export async function login(credentials: LoginPayload): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/api/auth/login/', credentials)
  return data
}

export async function register(payload: RegisterPayload): Promise<AuthUser> {
  const { data } = await apiClient.post<AuthUser>('/api/auth/register/', payload)
  return data
}

export async function refreshToken(refresh: string): Promise<RefreshResponse> {
  const { data } = await apiClient.post<RefreshResponse>('/api/auth/token/refresh/', { refresh })
  return data
}

export async function logout(refresh: string): Promise<{ status?: string }> {
  const { data } = await apiClient.post<{ status?: string }>('/api/auth/logout/', { refresh })
  return data
}

export function roleRedirect(_role?: UserRole | null): string {
  return '/tickets'
}
