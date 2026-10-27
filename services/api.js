import { create } from 'axios'

import { BASE_URL, ENDPOINTS } from '../config/endpoints'
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
  ENDPOINTS.LOGIN,
  ENDPOINTS.REGISTER,
  ENDPOINTS.VERIFY_EMAIL,
  ENDPOINTS.CONFIRM_LOGIN,
  ENDPOINTS.FORGOT_PASSWORD,
  ENDPOINTS.RESET_PASSWORD,
  ENDPOINTS.TWO_FACTOR_RESEND,
  ENDPOINTS.TWO_FACTOR_VERIFY,
]

const isPublicEndpoint = (url = '') => {
  const path = url.split('?')[0]
  return PUBLIC_ENDPOINTS.some((endpoint) => path.endsWith(endpoint))
}
const REAUTH_ENDPOINTS = [ENDPOINTS.EMAIL, ENDPOINTS.PASSWORD, ENDPOINTS.TWO_FACTOR_DISABLE]
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
    if (error.response?.status === 401 && !error.config?.skipAuth && !isPublicEndpoint(error.config?.url) && !isReauthenticationEndpoint(error.config?.url)) {
      await storage.clearAll()
      emitAuthExpired()
    }
    return Promise.reject(error)
  }
)

export default api

