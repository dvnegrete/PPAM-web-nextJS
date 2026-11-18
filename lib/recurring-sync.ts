import type { AppliedMonth } from '@/lib/services/recurring';
import type { PendingMonth } from '@/lib/types';

/** «septiembre 2026», «septiembre 2026 y octubre 2026», «a, b y c». */
export function joinMonthLabels(months: Array<{ label: string }>): string {
  const labels = months.map((month) => month.label);
  if (labels.length <= 1) return labels[0] ?? '';
  return `${labels.slice(0, -1).join(', ')} y ${labels[labels.length - 1]}`;
}

/** Lo que falta por aplicar, sumando todos los meses, en frases cortas. */
export function pendingParts(months: PendingMonth[]): string[] {
  const total = (pick: (month: PendingMonth) => number) =>
    months.reduce((sum, month) => sum + pick(month), 0);
  const toRelease = total((month) => month.toRelease);
  const toSeat = total((month) => month.toSeat);
  const shiftsToCreate = total((month) => month.shiftsToCreate);

  const parts: string[] = [];
  if (toRelease > 0) parts.push(`${toRelease} fecha(s) por retirar a titulares anteriores`);
  if (toSeat > 0) parts.push(`${toSeat} fecha(s) por asignar a titulares nuevos`);
  if (shiftsToCreate > 0) parts.push(`${shiftsToCreate} turno(s) de franjas nuevas por crear`);
  return parts;
}

/** Titulares que no cabrán porque una cobertura ya ocupó el lugar. */
export function pendingNotSeated(months: PendingMonth[]): number {
  return months.reduce((sum, month) => sum + month.notSeated, 0);
}

/** El resumen que se muestra después de aplicar. */
export function appliedSummary(applied: AppliedMonth[]): string {
  const total = (pick: (month: AppliedMonth) => number) =>
    applied.reduce((sum, month) => sum + pick(month), 0);
  const released = total((month) => month.result.formerHoldersReleased);
  const seated = total((month) => month.result.assignmentsCreated);
  const created = total((month) => month.result.shiftsCreated);
  const notSeated = total((month) => month.result.holdersNotSeated);

  const parts = [
    `${released} fecha(s) retirada(s) a titulares anteriores`,
    `${seated} fecha(s) asignada(s) a titulares`,
  ];
  if (created > 0) parts.push(`${created} turno(s) nuevo(s)`);
  if (notSeated > 0)
    parts.push(`${notSeated} titular(es) sin lugar por una cobertura ya registrada`);
  return `Se aplicó a ${joinMonthLabels(applied)}: ${parts.join(' · ')}.`;
}
