import api from './api';

export const mapsService = {
  async geocode(address) {
    const response = await api.post('/maps/geocode', { address, language: 'es', region: 'co' });
    if (response.data?.status && response.data.status !== 'OK') {
      throw new Error(`La dirección no pudo geocodificarse (${response.data.status}). Revisa la ciudad y la dirección.`);
    }
    const result = response.data?.results?.[0];
    if (!result || !Number.isFinite(Number(result.latitude)) || !Number.isFinite(Number(result.longitude))) {
      throw new Error('La dirección no pudo convertirse en coordenadas. Revisa calle, barrio, número y país.');
    }
    return {
      latitude: Number(result.latitude),
      longitude: Number(result.longitude),
      formattedAddress: result.formattedAddress,
    };
  },
};
