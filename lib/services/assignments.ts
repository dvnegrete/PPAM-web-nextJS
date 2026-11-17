import { api } from '@/lib/api';

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
