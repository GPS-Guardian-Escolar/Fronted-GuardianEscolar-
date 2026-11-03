import { create } from 'axios'

import { BASE_URL, ENDPOINTS } from '../config/endpoints'
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

