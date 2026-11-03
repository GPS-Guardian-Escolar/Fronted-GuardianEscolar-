import api from './api';
import { ENDPOINTS } from '../config/endpoints';

export const routeService = {
  list: async () => {
    const response = await api.get(ENDPOINTS.ROUTES);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post(ENDPOINTS.ROUTES, data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(ENDPOINTS.ROUTE_BY_ID(id), data);
    return response.data;
  },

  remove: async (id) => {
    await api.delete(ENDPOINTS.ROUTE_BY_ID(id));
  },

  addStop: async (routeId, data) => {
    const response = await api.post(ENDPOINTS.ROUTE_STOPS(routeId), data);
    return response.data;
  },
};
