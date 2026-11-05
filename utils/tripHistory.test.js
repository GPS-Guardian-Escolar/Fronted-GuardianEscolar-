import { it, expect } from '@jest/globals';
import { getHistoryObservationKey, hasTrackingIncident, matchesHistoryStatus } from './tripHistory';

it('includes a completed trip with an incident in both corresponding filters', () => {
  const trip = { estado: 'Completado', alerta: true };
  expect(matchesHistoryStatus(trip, 'Completado')).toBe(true);
  expect(matchesHistoryStatus(trip, 'Con Incidente')).toBe(true);
  expect(matchesHistoryStatus(trip, 'En Proceso')).toBe(false);
});

it('marks a trip as an incident when location was unavailable or tracking stopped', () => {
  expect(hasTrackingIncident({}, [{ eventType: 'LOCATION_UNAVAILABLE' }])).toBe(true);
  expect(hasTrackingIncident({}, [{ eventType: 'LOCATION_STOPPED' }])).toBe(true);
  expect(hasTrackingIncident({}, [{ eventType: 'TRIP_STARTED' }])).toBe(false);
  expect(getHistoryObservationKey({ incidentEventType: 'LOCATION_UNAVAILABLE', alerta: true }))
    .toBe('histObsLocationUnavailable');
});
