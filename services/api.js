import { create } from 'axios'

import { BASE_URL } from '../config/endpoints'
import { emitAuthExpired } from '../utils/authEvents'
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

// Si el servidor rechaza la sesion, cierra la sesion automaticamente
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if ([401, 403].includes(error.response?.status) && !isReauthenticationEndpoint(error.config?.url)) {
      await storage.clearAll()
      emitAuthExpired()
    }
    return Promise.reject(error)
  }
)

export default api

