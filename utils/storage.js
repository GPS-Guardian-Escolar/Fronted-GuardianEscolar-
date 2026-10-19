import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'gps_guardian_token';
const USER_KEY = 'gps_guardian_user';
const REMEMBERED_EMAIL_KEY = 'gps_guardian_remembered_email';

export const storage = {
  // Token (seguro en móviles, AsyncStorage en web por compatibilidad)
  setToken: async (token) => {
    try {
      if (Platform.OS === 'web') {
        await AsyncStorage.setItem(TOKEN_KEY, token);
      } else {
        await SecureStore.setItemAsync(TOKEN_KEY, token);
      }
    } catch (error) {
      console.error('Error guardando token:', error);
    }
  },

  getToken: async () => {
    try {
      if (Platform.OS === 'web') {
        return await AsyncStorage.getItem(TOKEN_KEY);
      } else {
        return await SecureStore.getItemAsync(TOKEN_KEY);
      }
    } catch (error) {
      console.error('Error obteniendo token:', error);
      return null;
    }
  },

  removeToken: async () => {
    try {
      if (Platform.OS === 'web') {
        await AsyncStorage.removeItem(TOKEN_KEY);
      } else {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
      }
    } catch (error) {
      console.error('Error eliminando token:', error);
    }
  },

  // Datos del usuario (no sensible)
  setUser: async (user) => {
    try {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Error guardando usuario:', error);
    }
  },

  getUser: async () => {
    try {
      const userJson = await AsyncStorage.getItem(USER_KEY);
      return userJson ? JSON.parse(userJson) : null;
    } catch {
      return null;
    }
  },

  removeUser: async () => {
    try {
      await AsyncStorage.removeItem(USER_KEY);
    } catch {}
  },

  setRememberedEmail: async (email) => {
    try {
      await AsyncStorage.setItem(REMEMBERED_EMAIL_KEY, email);
    } catch (error) {
      console.error('Error guardando correo recordado:', error);
    }
  },

  getRememberedEmail: async () => {
    try {
      return await AsyncStorage.getItem(REMEMBERED_EMAIL_KEY);
    } catch (error) {
      console.error('Error obteniendo correo recordado:', error);
      return null;
    }
  },

  removeRememberedEmail: async () => {
    try {
      await AsyncStorage.removeItem(REMEMBERED_EMAIL_KEY);
    } catch (error) {
      console.error('Error eliminando correo recordado:', error);
    }
  },

  clearAll: async () => {
    await Promise.all([storage.removeToken(), storage.removeUser()]);
  }
};
