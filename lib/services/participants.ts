import { api } from '@/lib/api';
import type {
  ImportResult,
  MaritalStatus,
  OrganizationValues,
  Participant,
  ParticipantStatus,
  SpouseCandidate,
  TurnosDeParticipante,
  UpdateParticipantResult,
} from '@/lib/types';

/** Participantes: las llamadas al servidor, para que las pantallas no armen rutas. */

export interface NewParticipant {
  firstName: string;
  paternalSurname: string;
  maternalSurname?: string;
  displayName?: string;
  phone: string;
  role: string;
  congregation?: string;
  circuit?: string;
  city?: string;
}

/** Solo lo que cambia; `null` borra el dato. */
export interface ParticipantChanges {
  firstName?: string;
  paternalSurname?: string;
  maternalSurname?: string | null;
  displayName?: string | null;
  phone?: string;
  role?: string;
  coverageAlerts?: boolean;
  status?: ParticipantStatus;
  congregation?: string | null;
  circuit?: string | null;
  city?: string | null;
  maritalStatus?: MaritalStatus;
  spouseParticipantId?: string | null;
  spouseName?: string | null;
}

export type ImportKind = 'participants' | 'assignments';

export function fetchParticipants(locationId: string): Promise<Participant[]> {
  return api<Participant[]>(`/locations/${locationId}/participants`);
}

export function fetchOrganizationValues(locationId: string): Promise<OrganizationValues> {
  return api<OrganizationValues>(`/locations/${locationId}/organization-values`);
}

export async function createParticipant(
  locationId: string,
  participant: NewParticipant,
): Promise<void> {
  await api(`/locations/${locationId}/participants`, { method: 'POST', body: participant });
}

export function updateParticipant(
  locationId: string,
  participantId: string,
  changes: ParticipantChanges,
): Promise<UpdateParticipantResult> {
  return api<UpdateParticipantResult>(`/locations/${locationId}/participants/${participantId}`, {
    method: 'PATCH',
    body: changes,
  });
}

export function fetchSpouseCandidates(
  locationId: string,
  participantId: string,
): Promise<SpouseCandidate[]> {
  return api<SpouseCandidate[]>(
    `/locations/${locationId}/participants/${participantId}/spouse-candidates`,
  );
}

export function fetchParticipantShifts(
  locationId: string,
  participantId: string,
): Promise<TurnosDeParticipante> {
  return api<TurnosDeParticipante>(`/locations/${locationId}/participants/${participantId}/shifts`);
}

/** Con `dryRun` el servidor valida el archivo y dice qué haría, sin guardar nada. */
export function importCsv(
  locationId: string,
  kind: ImportKind,
  csv: string,
  dryRun: boolean,
): Promise<ImportResult> {
  return api<ImportResult>(`/locations/${locationId}/import/${kind}`, {
    method: 'POST',
    body: { csv, dryRun },
  });
}
