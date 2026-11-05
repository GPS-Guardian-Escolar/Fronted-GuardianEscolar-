import { it, expect } from '@jest/globals';
import { getHistoryObservationKey, hasTrackingIncident, matchesHistoryStatus } from './tripHistory';

it('keeps a completed trip in the completed category while the incident is a separate event card', () => {
  const trip = { estado: 'Completado', alerta: true };
  expect(matchesHistoryStatus(trip, 'Completado')).toBe(true);
  expect(matchesHistoryStatus(trip, 'Con Incidente')).toBe(false);
  expect(matchesHistoryStatus(trip, 'En Proceso')).toBe(false);
});

it('classifies each notification card independently with its matching status category', () => {
  expect(matchesHistoryStatus({ rowType: 'event', eventType: 'ROUTE_DEVIATION' }, 'Con Incidente')).toBe(true);
  expect(matchesHistoryStatus({ rowType: 'event', eventType: 'ROUTE_DEVIATION' }, 'En Proceso')).toBe(false);
  expect(matchesHistoryStatus({ rowType: 'event', eventType: 'TRIP_COMPLETED' }, 'Completado')).toBe(true);
  expect(matchesHistoryStatus({ rowType: 'event', eventType: 'TRIP_STARTED' }, 'En Proceso')).toBe(true);
  expect(matchesHistoryStatus({ rowType: 'event', eventType: 'TRIP_STARTED' }, 'Con Incidente')).toBe(false);
});

it('marks a trip as an incident when location was unavailable or tracking stopped', () => {
  expect(hasTrackingIncident({}, [{ eventType: 'LOCATION_UNAVAILABLE' }])).toBe(true);
  expect(hasTrackingIncident({}, [{ eventType: 'LOCATION_STOPPED' }])).toBe(true);
  expect(hasTrackingIncident({}, [{ eventType: 'TRIP_STARTED' }])).toBe(false);
  expect(getHistoryObservationKey({ incidentEventType: 'LOCATION_UNAVAILABLE', alerta: true }))
    .toBe('histObsLocationUnavailable');
});
