import axios, { AxiosError } from 'axios'
import { storedLanguage } from '../i18n'
import type { ApiResponse } from './types'

export const TOKEN_KEY = 'moeez.token'
export const USER_KEY = 'moeez.user'

export const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  // The API returns its messages in this language, so toasts match the UI.
  config.headers['Accept-Language'] = storedLanguage()
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiResponse<unknown>>) => {
    // An expired or missing token drops the user back to the login screen.
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)

/**
 * Pulls the message out of the standard envelope. The server has already localized it to
 * whatever Accept-Language we sent, so this is display-ready; the fallbacks below only
 * cover the case where no response arrived at all.
 */
export function errorMessage(error: unknown, fallback?: string): string {
  const axiosError = error as AxiosError<ApiResponse<unknown>>
  const payload = axiosError?.response?.data
  if (payload?.message) {
    return payload.errors?.length ? `${payload.message} (${payload.errors[0]})` : payload.message
  }

  const english = storedLanguage() === 'en'
  if (axiosError?.code === 'ERR_NETWORK') {
    return english ? 'Could not reach the server' : 'سرور سے رابطہ نہیں ہو سکا'
  }
  return fallback ?? (english ? 'Something went wrong. Please try again.' : 'کچھ غلط ہو گیا۔ دوبارہ کوشش کریں۔')
}

/** Unwraps ApiResponse<T> so callers work with the payload directly. */
export async function getData<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const { data } = await api.get<ApiResponse<T>>(url, { params })
  return data.data
}

export async function postData<T>(url: string, body?: unknown): Promise<ApiResponse<T>> {
  const { data } = await api.post<ApiResponse<T>>(url, body ?? {})
  return data
}

export async function putData<T>(url: string, body?: unknown): Promise<ApiResponse<T>> {
  const { data } = await api.put<ApiResponse<T>>(url, body ?? {})
  return data
}

export async function deleteData<T>(url: string): Promise<ApiResponse<T>> {
  const { data } = await api.delete<ApiResponse<T>>(url)
  return data
}

/** Multipart POST/PUT for the product form (image upload). */
export async function sendForm<T>(url: string, form: FormData, method: 'post' | 'put' = 'post'): Promise<ApiResponse<T>> {
  const { data } = await api.request<ApiResponse<T>>({
    url,
    method,
    data: form,
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

/** Triggers a browser download for report exports. */
export async function downloadFile(url: string, fileName: string, params?: Record<string, unknown>) {
  const response = await api.get(url, { params, responseType: 'blob' })
  const blobUrl = URL.createObjectURL(response.data as Blob)
  const link = document.createElement('a')
  link.href = blobUrl
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(blobUrl)
}
