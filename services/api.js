import { create } from 'axios'

import { BASE_URL } from '../config/endpoints'
import { emitAuthExpired, emitPermissionDenied } from '../utils/authEvents'
import { storage } from '../utils/storage'

const api = create({
  baseURL: BASE_URL,
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
  },
})

const PUBLIC_ENDPOINTS = [
  '/auth/login',
  '/auth/register',
  '/auth/verify-email',
  '/auth/confirm-login',
  '/auth/password/forgot',
  '/auth/password/reset',
  '/auth/2fa/resend',
  '/auth/2fa/verify',
]

const isPublicEndpoint = (url = '') => {
  const path = url.split('?')[0]
  return PUBLIC_ENDPOINTS.some((endpoint) => path.endsWith(endpoint))
}
const REAUTH_ENDPOINTS = ['/auth/email', '/auth/password', '/auth/2fa/disable']
const isReauthenticationEndpoint = (url = '') => {
  const path = url.split('?')[0]
  return REAUTH_ENDPOINTS.some((endpoint) => path.endsWith(endpoint))
}
// Antes de cada petición, agrega el token JWT automáticamente
api.interceptors.request.use(
  async (config) => {
    const token = await storage.getToken()
    if (token && !config.skipAuth && !isPublicEndpoint(config.url)) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

export const handleResponseError = async (error) => {
  const status = error.response?.status
  const isProtectedRequest = !error.config?.skipAuth
    && !isPublicEndpoint(error.config?.url)
    && !isReauthenticationEndpoint(error.config?.url)

  if (status === 401 && isProtectedRequest) {
    await storage.clearAll()
    emitAuthExpired()
  } else if (status === 403 && isProtectedRequest) {
    emitPermissionDenied({
      message: error.response?.data?.message || error.response?.data?.mensaje,
      url: error.config?.url,
    })
  }

  return Promise.reject(error)
}

// Solo 401 invalida la sesion; 403 conserva la sesion y muestra permisos insuficientes.
api.interceptors.response.use(
  (response) => response,
  handleResponseError
)

export default api

