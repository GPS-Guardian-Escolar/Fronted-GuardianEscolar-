import { it, expect } from '@jest/globals';
import { matchesHistoryStatus } from './tripHistory';

it('includes a completed trip with an incident in both corresponding filters', () => {
  const trip = { estado: 'Completado', alerta: true };
  expect(matchesHistoryStatus(trip, 'Completado')).toBe(true);
  expect(matchesHistoryStatus(trip, 'Con Incidente')).toBe(true);
  expect(matchesHistoryStatus(trip, 'En Proceso')).toBe(false);
});
