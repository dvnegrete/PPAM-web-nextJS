import { api } from '@/lib/api';
import type { AnnounceResult, ConfirmationsDraft, PollDraft } from '@/lib/types';

/** Los textos que se publican en el grupo de WhatsApp: encuesta y confirmaciones. */

export type PollLevel = 'cupo' | 'minimo';

/** `from` y `to` son instantes ISO. */
export function fetchPollDraft(
  locationId: string,
  from: string,
  to: string,
  level: PollLevel,
): Promise<PollDraft> {
  return api<PollDraft>(`/locations/${locationId}/poll-draft?from=${from}&to=${to}&level=${level}`);
}

export function fetchConfirmationsDraft(locationId: string): Promise<ConfirmationsDraft> {
  return api<ConfirmationsDraft>(`/locations/${locationId}/confirmations-draft`);
}

/** Declara que esas confirmaciones ya se publicaron, para que no vuelvan a salir. */
export function announceConfirmations(locationId: string, keys: string[]): Promise<AnnounceResult> {
  return api<AnnounceResult>(`/locations/${locationId}/confirmations/announced`, {
    method: 'POST',
    body: { keys },
  });
}
