import { useState } from 'react'

import { useAuthContext } from '../contexts/AuthContext'
import { authService } from '../services/auth.service'

export function useAuth() {
  const { login, logout } = useAuthContext()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleLogin = async (email, password) => {
    try {
      setLoading(true)
      setError(null)
      const data = await authService.login(email, password)
      // data debe tener: { token, usuario: { id, nombre, email, rol } }
      await login(data.usuario, data.token)
      return true
    } catch (err) {
      setError(err.response?.data?.message || 'Error al iniciar sesión')
      return false
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (nombre, email, password) => {
    try {
      setLoading(true)
      setError(null)
      await authService.register({ name: nombre, email, password })
      return true
    } catch (err) {
      setError(err.response?.data?.message || 'Error al registrarse')
      return false
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (email) => {
    try {
      setLoading(true)
      setError(null)
      await authService.requestPasswordRecovery(email)
      return true
    } catch (err) {
      setError(err.response?.data?.message || 'Error al enviar el correo')
      return false
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await logout()
  }

  return {
    loading,
    error,
    handleLogin,
    handleRegister,
    handleForgotPassword,
    handleLogout,
  }
}
