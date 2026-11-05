import api from './api';
import { ENDPOINTS } from '../config/endpoints';

// Optional context for incomplete addresses. Leave empty when the app serves multiple cities.
const GEOCODING_CONTEXT = String(process.env.EXPO_PUBLIC_GEOCODING_CONTEXT || '').trim();

function geocodingQuery(address) {
  const value = String(address || '').trim();
  if (!value || /^-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?$/.test(value)) return value;
  const normalized = value.toLowerCase();
  if (!GEOCODING_CONTEXT || normalized.includes('neiva') || normalized.includes('huila') || normalized.includes('colombia')) {
    return value;
  }
  return `${value}, ${GEOCODING_CONTEXT}`;
}

export const mapsService = {
  async geocodeCandidates(address) {
    const response = await api.post(ENDPOINTS.MAP_GEOCODE, { address: geocodingQuery(address), language: 'es', region: 'co' });
    if (response.data?.status && response.data.status !== 'OK') throw new Error(`No se pudo ubicar la dirección (${response.data.status}).`);
    const candidates = (response.data?.results || []).filter(result => (
      result.latitude != null && result.longitude != null
      && String(result.latitude).trim() !== '' && String(result.longitude).trim() !== ''
      && Number.isFinite(Number(result.latitude)) && Number.isFinite(Number(result.longitude))
    ));
    if (!candidates.length) throw new Error('No se encontró una ubicación para esa dirección.');
    return candidates.map(result => ({
      latitude: Number(result.latitude), longitude: Number(result.longitude), formattedAddress: result.formattedAddress,
      placeId: result.placeId, locationType: result.locationType, partialMatch: Boolean(result.partialMatch),
    }));
  },
  async geocode(address) {
    const response = await api.post(ENDPOINTS.MAP_GEOCODE, { address: geocodingQuery(address), language: 'es', region: 'co' });
    if (response.data?.status && response.data.status !== 'OK') {
      throw new Error(`La dirección no pudo geocodificarse (${response.data.status}). Revisa la ciudad y la dirección.`);
    }
    const result = response.data?.results?.[0];
    if (!result || result.latitude == null || result.longitude == null || !Number.isFinite(Number(result.latitude)) || !Number.isFinite(Number(result.longitude))) {
      throw new Error('La dirección no pudo convertirse en coordenadas. Revisa calle, barrio, número y país.');
    }
    return {
      latitude: Number(result.latitude),
      longitude: Number(result.longitude),
      formattedAddress: result.formattedAddress,
    };
  },
  async directions(origin, destination) {
    const response = await api.post(ENDPOINTS.MAP_DIRECTIONS, { origin, destination, mode: 'driving', language: 'es' });
    const route = response.data?.routes?.[0];
    if (!route?.overviewPolyline) throw new Error('No se pudo calcular el trayecto.');
    return route;
  },
};
