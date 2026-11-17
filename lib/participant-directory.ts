import { nombreCompleto, nombreVisible } from '@/lib/nombres';
import { clave, coincide, digitos, type Buscable } from '@/lib/texto';
import type { OrganizationField, Participant, UpdateParticipantResult } from '@/lib/types';

/** El valor elegido en cada filtro; vacío significa «todas». */
export type OrganizationFilters = Record<OrganizationField, string>;

export const NO_FILTERS: OrganizationFilters = { congregation: '', circuit: '', city: '' };

/**
 * Lo buscable de cada persona, preparado una sola vez.
 *
 * Normalizar ciento treinta filas en cada tecla sería trabajo tirado: el
 * padrón solo cambia al recargarlo, así que el índice se arma con él.
 *
 * El cónyuge entra por sus **dos** vías —el nombre anotado de quien no
 * participa y el nombre compuesto de quien sí—, porque lo contrario sería que
 * buscar a una pareja funcione solo cuando no está en el padrón.
 */
export function buildSearchIndex(participants: Participant[]): Map<string, Buscable> {
  const index = new Map<string, Buscable>();
  for (const p of participants) {
    index.set(p.id, {
      texto: clave(
        [
          p.firstName,
          p.paternalSurname,
          p.maternalSurname,
          p.displayName,
          p.congregation,
          p.spouseName,
          p.spouse ? nombreCompleto(p.spouse) : null,
        ]
          .filter(Boolean)
          .join(' '),
      ),
      digitos: digitos(p.phoneE164),
    });
  }
  return index;
}

/**
 * Quiénes se ven con los filtros y la búsqueda actuales.
 *
 * La búsqueda acota dentro del filtro, no lo sustituye: son dos preguntas
 * distintas y combinarlas es lo que permite «de esta congregación, ¿quién...?».
 */
export function filterParticipants(
  participants: Participant[],
  filters: OrganizationFilters,
  terms: string[],
  index: Map<string, Buscable>,
): Participant[] {
  const fields = Object.keys(filters) as OrganizationField[];
  return participants
    .filter((p) => fields.every((field) => !filters[field] || p[field] === filters[field]))
    .filter((p) => terms.length === 0 || coincide(terms, index.get(p.id)!));
}

/** Los contadores del padrón entero: dicen qué falta por capturar. */
export function directoryCounts(participants: Participant[]) {
  return {
    total: participants.length,
    supervisors: participants.filter((p) => p.role !== 'PARTICIPANT').length,
    withoutOptIn: participants.filter((p) => !p.optInAt).length,
    withoutMaritalStatus: participants.filter((p) => p.maritalStatus === 'SIN_REGISTRAR').length,
    withoutCongregation: participants.filter((p) => !p.congregation).length,
    notActive: participants.filter((p) => p.status !== 'ACTIVE').length,
  };
}

/** «AL» para Ana López: lo que distingue una ficha de otra de un vistazo. */
export function initials(person: Participant): string {
  return `${person.firstName.charAt(0)}${person.paternalSurname.charAt(0)}`.toLocaleUpperCase(
    'es-MX',
  );
}

/**
 * Qué contar después de guardar.
 *
 * Los turnos liberados y los mensajes descartados no se ven en la tabla, así que
 * si no se dicen aquí el administrador no se enteraría de que ocurrieron.
 */
export function saveSummary(result: UpdateParticipantResult): string {
  const parts = [`${nombreVisible(result)}: cambios guardados.`];
  if (result.cancelledShifts > 0) {
    parts.push(
      result.cancelledShifts === 1
        ? 'Se liberó 1 turno futuro, sin convocar a nadie.'
        : `Se liberaron ${result.cancelledShifts} turnos futuros, sin convocar a nadie.`,
    );
  }
  if (result.removedFixedShifts > 0) {
    parts.push(
      result.removedFixedShifts === 1
        ? 'Se quitó 1 turno fijo.'
        : `Se quitaron ${result.removedFixedShifts} turnos fijos.`,
    );
  }
  parts.push(...result.warnings);
  return parts.join(' ');
}
