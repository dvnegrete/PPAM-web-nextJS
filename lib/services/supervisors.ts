import { api } from '@/lib/api';

/** Guardia de encargados: las llamadas al servidor y la forma de sus datos. */

export interface SupervisorWindow {
  id: string;
  weekday: number;
  startMinute: number;
  endMinute: number;
}

export interface Supervisor {
  id: string;
  /** Nombre ya compuesto por el servidor, listo para mostrar. */
  fullName: string;
  phoneE164: string;
  onDuty: boolean;
  overrideActive: boolean;
  available: boolean | null;
  windows: SupervisorWindow[];
}

export interface NewSupervisorWindow {
  weekday: number;
  startMinute: number;
  endMinute: number;
}

export function fetchSupervisors(locationId: string): Promise<Supervisor[]> {
  return api<Supervisor[]>(`/locations/${locationId}/supervisors`);
}

export async function addSupervisorWindow(
  locationId: string,
  supervisorId: string,
  window: NewSupervisorWindow,
): Promise<void> {
  await api(`/locations/${locationId}/supervisors/${supervisorId}/windows`, {
    method: 'POST',
    body: window,
  });
}

export async function removeSupervisorWindow(windowId: string): Promise<void> {
  await api(`/supervisors/windows/${windowId}`, { method: 'DELETE' });
}
