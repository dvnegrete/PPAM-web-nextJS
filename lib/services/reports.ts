import { api } from '@/lib/api';
import type {
  AttendanceRow,
  AuditHistoryPage,
  CategoriaBitacora,
  MonthlySummary,
} from '@/lib/types';

/** Reportes y bitácora. */

export interface AuditHistoryQuery {
  limit: number;
  /** Instantes ISO. */
  from?: string;
  to?: string;
  category?: CategoriaBitacora;
  /** Nombre o parte del nombre de una persona. */
  person?: string;
  /** Con qué seguir hacia atrás; lo entrega la página anterior. */
  cursor?: string | null;
}

export function fetchMonthlySummary(
  locationId: string,
  year: number,
  month: number,
): Promise<MonthlySummary> {
  return api<MonthlySummary>(`/locations/${locationId}/reports/monthly?year=${year}&month=${month}`);
}

/** `from` y `to` son instantes ISO. */
export function fetchAttendance(
  locationId: string,
  from: string,
  to: string,
): Promise<AttendanceRow[]> {
  return api<AttendanceRow[]>(`/locations/${locationId}/reports/attendance?from=${from}&to=${to}`);
}

export function fetchAuditHistory(query: AuditHistoryQuery): Promise<AuditHistoryPage> {
  const params = new URLSearchParams({ limit: String(query.limit) });
  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);
  if (query.category) params.set('categoria', query.category);
  if (query.person) params.set('persona', query.person);
  if (query.cursor) params.set('cursor', query.cursor);
  return api<AuditHistoryPage>(`/audit?${params.toString()}`);
}
