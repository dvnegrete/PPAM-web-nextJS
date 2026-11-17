import { WEEKDAY_TITLES } from '@/lib/calendar-labels';
import { rango12h } from '@/lib/horas';
import type { RecurringSlot } from '@/lib/types';

/** Cómo se nombra la semana del mes de una franja: «1.ª semana». */
export const WEEK_ORDINALS = ['', '1.ª', '2.ª', '3.ª', '4.ª', '5.ª'];

/** «Lunes · 7:00 a 9:00 am · todas las semanas». */
export function describeSlot(slot: RecurringSlot): string {
  const range = rango12h(slot.startMinute, slot.endMinute);
  return slot.weekOfMonth === 0
    ? `${WEEKDAY_TITLES[slot.weekday]} · ${range} · todas las semanas`
    : `${WEEKDAY_TITLES[slot.weekday]} · ${range} · ${WEEK_ORDINALS[slot.weekOfMonth]} semana del mes`;
}

/** Clase de la etiqueta de cupo: completo, a medias o sin nadie. */
export function capacityClass(slot: RecurringSlot): string {
  if (slot.freeSlots === 0) return 'completo';
  return slot.holders.length === 0 ? 'critico' : 'faltante';
}

export interface SlotGroups {
  /** Franjas que se repiten todas las semanas. */
  weekly: RecurringSlot[];
  /** Franjas que dependen de la semana del mes. */
  byWeekOfMonth: RecurringSlot[];
  /** Qué semanas del mes tienen franjas, en orden. */
  weeksAvailable: number[];
}

/**
 * Las franjas que se repiten todas las semanas van juntas; las que dependen
 * del ordinal del mes —típicamente sábados y domingos— se separan, porque una
 * sola rejilla con las cinco semanas sería ilegible.
 */
export function groupSlots(slots: RecurringSlot[]): SlotGroups {
  const weekly = slots.filter((slot) => slot.weekOfMonth === 0);
  const byWeekOfMonth = slots.filter((slot) => slot.weekOfMonth > 0);
  const weeksAvailable = [...new Set(byWeekOfMonth.map((slot) => slot.weekOfMonth))].sort(
    (a, b) => a - b,
  );
  return { weekly, byWeekOfMonth, weeksAvailable };
}
