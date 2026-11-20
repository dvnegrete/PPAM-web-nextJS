import { api } from '@/lib/api';
import type { GenerationResult } from '@/lib/services/calendar';
import type { RecurringCandidate, RecurringOverview, UpcomingMonth } from '@/lib/types';

/** Turnos fijos: las llamadas al servidor, para que las pantallas no armen rutas. */

export function fetchRecurringOverview(locationId: string): Promise<RecurringOverview> {
  return api<RecurringOverview>(`/locations/${locationId}/recurring`);
}

export function fetchRecurringCandidates(
  locationId: string,
  templateId: string,
): Promise<RecurringCandidate[]> {
  return api<RecurringCandidate[]>(`/locations/${locationId}/recurring/${templateId}/candidates`);
}

export async function addRecurringHolder(
  locationId: string,
  templateId: string,
  participantId: string,
): Promise<void> {
  await api(`/locations/${locationId}/recurring/${templateId}/holders`, {
    method: 'POST',
    body: { participantId },
  });
}

export async function removeRecurringHolder(recurringId: string): Promise<void> {
  await api(`/recurring/${recurringId}`, { method: 'DELETE' });
}

/** Marcar a uno como capitán le quita la marca al anterior: lo resuelve el servidor. */
export async function setRecurringCaptain(recurringId: string, isCaptain: boolean): Promise<void> {
  await api(`/recurring/${recurringId}/captain`, { method: 'PATCH', body: { isCaptain } });
}

/** Un mes próximo al que se le aplicaron los turnos fijos, con lo que cambió. */
export interface AppliedMonth extends UpcomingMonth {
  result: GenerationResult;
}

/** Vuelve a generar los meses próximos ya generados con los turnos fijos de hoy. */
export function applyRecurringToUpcomingMonths(locationId: string): Promise<AppliedMonth[]> {
  return api<AppliedMonth[]>(`/locations/${locationId}/recurring/apply`, { method: 'POST' });
}
