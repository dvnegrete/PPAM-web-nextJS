/**
 * Composición del nombre, espejo de `server/src/common/names/person-name.ts`.
 *
 * El panel recibe los tres campos crudos y compone del lado del cliente, para
 * poder mostrar el formato formal en el padrón y el nombre corriente en el
 * tablero sin pedir dos versiones al servidor.
 */

export interface PersonName {
  firstName: string;
  paternalSurname: string;
  maternalSurname?: string | null;
  displayName?: string | null;
}

function partes(...valores: Array<string | null | undefined>): string[] {
  return valores.filter((valor): valor is string => Boolean(valor?.trim()));
}

/** Para padrón y reportes: «López Pérez, Ana María». */
export function nombreFormal(persona: PersonName): string {
  const apellidos = partes(persona.paternalSurname, persona.maternalSurname).join(' ');
  return apellidos ? `${apellidos}, ${persona.firstName}` : persona.firstName;
}

/** Para el tablero: el nombre que eligió, o «Ana María López». */
export function nombreVisible(persona: PersonName): string {
  const elegido = persona.displayName?.trim();
  if (elegido) return elegido;
  return partes(persona.firstName, persona.paternalSurname).join(' ');
}

/** Nombre completo en el orden del habla: «Ana María López Pérez». */
export function nombreCompleto(persona: PersonName): string {
  return partes(persona.firstName, persona.paternalSurname, persona.maternalSurname).join(' ');
}
