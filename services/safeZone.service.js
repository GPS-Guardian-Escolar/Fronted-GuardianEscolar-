import api from './api';
import { ENDPOINTS } from '../config/endpoints';

export const safeZoneService = {
  async list() {
    const response = await api.get(ENDPOINTS.SAFE_ZONES);
    return response.data;
  },

  async create(data) {
    const response = await api.post(ENDPOINTS.SAFE_ZONES, data);
    return response.data;
  },

  async update(id, data) {
    const response = await api.put(ENDPOINTS.SAFE_ZONE_BY_ID(id), data);
    return response.data;
  },

  async remove(id) {
    await api.delete(ENDPOINTS.SAFE_ZONE_BY_ID(id));
  },
};
