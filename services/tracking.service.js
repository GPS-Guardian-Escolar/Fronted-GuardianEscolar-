import { collectPages } from './pagination';
import api from './api';
import { ENDPOINTS } from '../config/endpoints';

export const trackingService = {
  listTrips: async () => {
    return collectPages(async page => (await api.get(ENDPOINTS.TRIPS, { params: { page, size: 100 } })).data);
  },

  startTrip: async ({ studentId, routeId, tripStartedAt }, options = {}) => {
    const response = await api.post(ENDPOINTS.TRIPS, {
      studentId,
      routeId,
      tripStartedAt,
    }, buildChildAuthConfig(options));
    return response.data;
  },

  updateStatus: async (tripId, data, options = {}) => {
    const response = await api.patch(ENDPOINTS.TRIP_STATUS(tripId), data, buildChildAuthConfig(options));
    return response.data;
  },

  addCoordinate: async (tripId, data, options = {}) => {
    const response = await api.post(ENDPOINTS.TRIP_COORDINATES(tripId), data, buildChildAuthConfig(options));
    return response.data;
  },

  listCoordinates: async (tripId, options = {}) => {
    return collectPages(async page => (await api.get(ENDPOINTS.TRIP_COORDINATES(tripId), { ...buildChildAuthConfig(options), params: { page, size: 100 } })).data);
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
