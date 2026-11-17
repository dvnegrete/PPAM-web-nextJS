import { api } from '@/lib/api';
import type { Dashboard, Movement } from '@/lib/types';

/** Tablero operativo: los turnos del rango y lo que se ha movido en ellos. */

export function fetchDashboard(locationId: string, from: Date, to: Date): Promise<Dashboard> {
  return api<Dashboard>(
    `/locations/${locationId}/dashboard?from=${from.toISOString()}&to=${to.toISOString()}`,
  );
}

/** Los últimos movimientos del punto, del más nuevo al más viejo. */
export function fetchRecentMovements(locationId: string, limit: number): Promise<Movement[]> {
  return api<Movement[]>(`/locations/${locationId}/movements?limit=${limit}`);
}

/** El recorrido completo de un turno, incluido quien ya no figura en él. */
export function fetchShiftHistory(shiftId: string): Promise<Movement[]> {
  return api<Movement[]>(`/shifts/${shiftId}/history`);
}
