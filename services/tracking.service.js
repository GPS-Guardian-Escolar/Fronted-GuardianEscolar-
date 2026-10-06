import api from './api';

export const trackingService = {
  listTrips: async () => {
    const response = await api.get('/trips');
    return response.data;
  },

  startTrip: async ({ studentId, routeId, tripStartedAt }, options = {}) => {
    const response = await api.post('/trips', {
      studentId,
      routeId,
      tripStartedAt,
    }, buildChildAuthConfig(options));
    return response.data;
  },

  updateStatus: async (tripId, data) => {
    const response = await api.patch(`/trips/${tripId}/status`, data);
    return response.data;
  },

  addCoordinate: async (tripId, data, options = {}) => {
    const response = await api.post(`/trips/${tripId}/coordinates`, data, buildChildAuthConfig(options));
    return response.data;
  },

  listCoordinates: async (tripId) => {
    const response = await api.get(`/trips/${tripId}/coordinates`);
    return response.data;
  },
};

function buildChildAuthConfig(options = {}) {
  if (!options.childToken) return undefined;
  return {
    skipAuth: true,
    headers: {
      Authorization: `Bearer ${options.childToken}`,
    },
  };
}
