import { api } from '@/lib/api';
import type { RecurringCandidate, RecurringOverview } from '@/lib/types';

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
