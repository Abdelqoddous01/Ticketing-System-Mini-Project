import { apiClient } from './http'

const USERS_ENDPOINT = '/api/users/'

export type UserRole = 'customer' | 'agent' | 'admin'

export interface User {
  id: number
  email: string
  role: UserRole
  is_active: boolean
  first_name?: string
  last_name?: string
}

interface Option<T> {
  label: string
  value: T
}

export interface UserListParams {
  [key: string]: string | number | boolean | null | undefined
}

export interface UserCreatePayload {
  email: string
  password: string
  role: UserRole
}

export type UserUpdatePayload = Partial<Pick<User, 'email' | 'role' | 'is_active'>> & {
  password?: string
}

export const USER_ROLE_OPTIONS: Option<UserRole>[] = [
  { label: 'Customer', value: 'customer' },
  { label: 'Agent', value: 'agent' },
  { label: 'Admin', value: 'admin' },
]

function usersPath(id: number | string = ''): string {
  return `${USERS_ENDPOINT}${id ? `${id}/` : ''}`
}

export async function listUsers(params: UserListParams = {}): Promise<User[]> {
  const { data } = await apiClient.get<User[]>(usersPath(), { params })
  return data
}

export async function createUser(payload: UserCreatePayload): Promise<User> {
  const { data } = await apiClient.post<User>(usersPath(), payload)
  return data
}

export async function getUser(id: number | string): Promise<User> {
  const { data } = await apiClient.get<User>(usersPath(id))
  return data
}

export async function updateUser(id: number | string, payload: UserUpdatePayload): Promise<User> {
  const { data } = await apiClient.patch<User>(usersPath(id), payload)
  return data
}

export async function deactivateUser(id: number | string): Promise<{ status?: string }> {
  const { data } = await apiClient.post<{ status?: string }>(`${usersPath(id)}deactivate/`)
  return data
}
