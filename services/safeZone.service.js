import api from './api';

export const safeZoneService = {
  async list() {
    const response = await api.get('/safe-zones');
    return response.data;
  },

  async create(data) {
    const response = await api.post('/safe-zones', data);
    return response.data;
  },

  async update(id, data) {
    const response = await api.put(`/safe-zones/${id}`, data);
    return response.data;
  },

  async remove(id) {
    await api.delete(`/safe-zones/${id}`);
  },
};
