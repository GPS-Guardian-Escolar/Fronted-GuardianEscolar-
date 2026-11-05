import api from './api';
import { ENDPOINTS } from '../config/endpoints';

export const adminService = {
  dashboard: async () => {
    const response = await api.get(ENDPOINTS.ADMIN_DASHBOARD);
    return response.data;
  },

  recentAlerts: async (limit = 10) => {
    const response = await api.get(ENDPOINTS.ADMIN_ALERTS, { params: { limit } });
    return response.data;
  },

  recentAudit: async (limit = 10) => {
    const response = await api.get(ENDPOINTS.ADMIN_AUDIT, { params: { limit } });
    return response.data;
  },

  recentErrors: async (limit = 10) => {
    const response = await api.get(ENDPOINTS.ADMIN_ERRORS, { params: { limit } });
    return response.data;
  },
};
