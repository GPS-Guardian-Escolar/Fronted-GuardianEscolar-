import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import api from './api';
import { ENDPOINTS } from '../config/endpoints';

const projectId =
  Constants.expoConfig?.extra?.eas?.projectId ||
  Constants.easConfig?.projectId;

const platformName = () => {
  if (Platform.OS === 'ios') return 'IOS';
  if (Platform.OS === 'android') return 'ANDROID';
  return 'WEB';
};

const getDeviceName = () => {
  if (Platform.OS === 'web') return 'Web browser';
  return Device.deviceName || `${Device.manufacturer || 'Device'} ${Device.modelName || ''}`.trim();
};

const isExpoGo = () =>
  Constants.appOwnership === 'expo' || Constants.executionEnvironment === 'storeClient';

export const notificationService = {
  registerPushDevice: async () => {
    if (Platform.OS === 'web' || !Device.isDevice || isExpoGo()) {
      return null;
    }

    const Notifications = await import('expo-notifications');

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#208AEF',
      });
    }

    const current = await Notifications.getPermissionsAsync();
    let status = current.status;
    if (status !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
    }

    if (status !== 'granted') {
      return null;
    }

    const tokenResult = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();

    const response = await api.post(ENDPOINTS.DEVICES, {
      expoPushToken: tokenResult.data,
      platform: platformName(),
      deviceName: getDeviceName(),
    });
    return response.data;
  },

  listNotifications: async () => {
    const response = await api.get(ENDPOINTS.NOTIFICATIONS);
    return response.data;
  },

  markAsRead: async (receiptId) => {
    const response = await api.patch(ENDPOINTS.MARK_READ(receiptId));
    return response.data;
  },

  markAllAsRead: async () => {
    const response = await api.patch(ENDPOINTS.MARK_ALL_READ);
    return response.data;
  },

  getPreferences: async () => {
    const response = await api.get(ENDPOINTS.NOTIFICATION_SETTINGS);
    return {
      alertaInactividad: response.data.inactivityAlert,
      canalEmail: response.data.emailChannel,
    };
  },

  updatePreferences: async (preferences) => {
    const response = await api.put(ENDPOINTS.NOTIFICATION_SETTINGS, {
      inactivityAlert: preferences.alertaInactividad,
      emailChannel: preferences.canalEmail,
    });
    return {
      alertaInactividad: response.data.inactivityAlert,
      canalEmail: response.data.emailChannel,
    };
  },
};
