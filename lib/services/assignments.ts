import { api } from '@/lib/api';
import type { AvailableParticipant, ExternalCover } from '@/lib/types';

/** Lugares en un turno concreto: darlos de baja y registrarlos. */

export interface AssignmentCancellation {
  reasonCode: string;
  reason?: string;
  /** Da de baja también a su cónyuge, si atiende el mismo turno. */
  cancelSpouse: boolean;
}

export interface CancellationResult {
  ok: true;
  /** Nombre del cónyuge al que también alcanzó la baja, o `null`. */
  spouseCancelled: string | null;
}

export function cancelAssignment(
  assignmentId: string,
  cancellation: AssignmentCancellation,
): Promise<CancellationResult> {
  return api<CancellationResult>(`/assignments/${assignmentId}/cancel`, {
    method: 'POST',
    body: cancellation,
  });
}

/** Quién cubre: alguien del padrón, o los datos de quien viene de fuera. */
export type ShiftCover =
  | { participantId: string }
  | { external: Omit<ExternalCover, 'note'> & { note?: string } };

/** Quiénes pueden tomar ese turno. */
export function fetchAvailableParticipants(
  locationId: string,
  shiftId: string,
): Promise<AvailableParticipant[]> {
  return api<AvailableParticipant[]>(
    `/locations/${locationId}/shifts/${shiftId}/available-participants`,
  );
}

export async function coverShift(
  locationId: string,
  shiftId: string,
  cover: ShiftCover,
): Promise<void> {
  await api(`/locations/${locationId}/shifts/${shiftId}/assignments`, {
    method: 'POST',
    body: cover,
  });
}
