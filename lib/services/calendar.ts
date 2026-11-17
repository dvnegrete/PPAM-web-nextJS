import { api } from '@/lib/api';
import type { CalendarShift, RolMensual } from '@/lib/types';

/** El calendario de un mes: sus turnos, su generación y el rol para compartir. */

export interface GenerationResult {
  shiftsCreated: number;
  shiftsExisting: number;
  /** Turnos que ya existían y a los que se sentó algún titular que faltaba. */
  shiftsFilled: number;
  assignmentsCreated: number;
}

export function fetchMonthCalendar(
  locationId: string,
  year: number,
  month: number,
): Promise<CalendarShift[]> {
  return api<CalendarShift[]>(`/locations/${locationId}/calendar?year=${year}&month=${month}`);
}

/** Crea los turnos que falten en el mes y completa los titulares de los que ya existen. */
export function generateMonth(
  locationId: string,
  year: number,
  month: number,
): Promise<GenerationResult> {
  return api<GenerationResult>(`/locations/${locationId}/calendar/generate`, {
    method: 'POST',
    body: { year, month },
  });
}

export function fetchMonthRoster(
  locationId: string,
  year: number,
  month: number,
): Promise<RolMensual> {
  return api<RolMensual>(`/locations/${locationId}/roster?year=${year}&month=${month}`);
}
