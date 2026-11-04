import { collectPages } from './pagination';
import api from './api';
import { ENDPOINTS } from '../config/endpoints';

async function createTrip({ studentId, routeId, tripStartedAt }, options = {}) {
  const response = await api.post(ENDPOINTS.TRIPS, {
    studentId,
    routeId,
    tripStartedAt,
  }, buildChildAuthConfig(options));
  return response.data;
}

export const trackingService = {
  listTrips: async () => {
    return collectPages(async page => (await api.get(ENDPOINTS.TRIPS, { params: { page, size: 100 } })).data);
  },

  startTrip: createTrip,

  deleteTrip: async (tripId) => {
    await api.delete(ENDPOINTS.TRIP_BY_ID(tripId));
  },

  getActiveTrip: async (studentId, options = {}) => {
    const response = await api.get(`${ENDPOINTS.TRIPS}/active`, {
      ...buildChildAuthConfig(options), params: { studentId },
    });
    return response.status === 204 ? null : response.data || null;
  },

  startOrResumeTrip: async ({ studentId, routeId, tripStartedAt }, options = {}) => {
    const active = await trackingService.getActiveTrip(studentId, options);
    if (active?.id) return { trip: active, created: false };
    try {
      return { trip: await createTrip({ studentId, routeId, tripStartedAt }, options), created: true };
    } catch (error) {
      // Another request may have started the trip between the lookup and POST.
      if ([400, 409].includes(error?.response?.status)) {
        const concurrent = await trackingService.getActiveTrip(studentId, options);
        if (concurrent?.id) return { trip: concurrent, created: false };
      }
      throw error;
    }
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
