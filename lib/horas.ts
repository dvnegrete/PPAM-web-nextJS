/**
 * Cómo se lee una hora en el panel.
 *
 * Todo lo que una persona lee aquí va en reloj de 12 horas: los turnos se
 * atienden por voluntarios, y «15:00 a 17:00» obliga a traducir mentalmente lo
 * que en el grupo se dice como «3 a 5 de la tarde».
 *
 * La base y la API siguen en 24 horas —los turnos se guardan como minutos desde
 * la medianoche local—, así que la conversión vive solo aquí, en el único punto
 * del panel que decide cómo se escribe una hora. El servidor usa la misma
 * convención para la encuesta de WhatsApp (`poll-draft.service.ts`); son dos
 * repositorios sin código compartido, así que si una cambia hay que cambiar la
 * otra a mano.
 */

const MESES_CORTOS = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
] as const;

/**
 * «07:00» + «am» a partir de 420.
 *
 * No usa `Intl`: en `es-MX` el meridiano sale como «a. m.», con puntos y
 * espacio, y además cambia entre versiones de Node y de los navegadores.
 */
export function hora12(minuteOfDay: number): { reloj: string; meridiano: 'am' | 'pm' } {
  const hora24 = Math.floor(minuteOfDay / 60) % 24;
  const hora = hora24 % 12 === 0 ? 12 : hora24 % 12;
  return {
    reloj: `${String(hora).padStart(2, '0')}:${String(minuteOfDay % 60).padStart(2, '0')}`,
    meridiano: hora24 < 12 ? 'am' : 'pm',
  };
}

/**
 * «07:00 a 09:00 am», o «11:00 am a 01:00 pm».
 *
 * Con los dos extremos en la misma mitad del día basta decirlo una vez al
 * final; solo cuando el turno cruza el mediodía hay que marcar los dos, que es
 * donde se presta a confusión.
 */
export function rango12h(startMinute: number, endMinute: number): string {
  const inicio = hora12(startMinute);
  const fin = hora12(endMinute);
  return inicio.meridiano === fin.meridiano
    ? `${inicio.reloj} a ${fin.reloj} ${fin.meridiano}`
    : `${inicio.reloj} ${inicio.meridiano} a ${fin.reloj} ${fin.meridiano}`;
}

/**
 * El horario de un turno, venga del tablero, del calendario o de una plantilla.
 *
 * Acepta el turno completo y no los dos minutos para poder caer a `range` —el
 * texto en 24 horas que redacta el servidor— cuando los minutos no llegan. Los
 * dos repositorios se despliegan por separado: si el panel sube antes que la
 * API, esto es lo que evita ver «NaN:NaN» hasta que la API se actualice.
 */
export function rangoTurno(turno: {
  startMinute?: number;
  endMinute?: number;
  range?: string;
}): string {
  if (typeof turno.startMinute === 'number' && typeof turno.endMinute === 'number') {
    return rango12h(turno.startMinute, turno.endMinute);
  }
  return turno.range ?? '';
}

/** «26 oct, 1:05 pm» */
export function fechaCorta(iso: string | null): string {
  return marca(iso, false);
}

/** «26 oct 2026, 1:05 pm» — con año, para lo que se consulta hacia atrás. */
export function fechaLarga(iso: string | null): string {
  return marca(iso, true);
}

/**
 * Día, mes y hora de un instante, en la zona de quien lo mira.
 *
 * El día y el mes se arman a mano por lo mismo que la hora: así la fecha de la
 * bitácora y el horario de un turno se escriben con una sola convención, sin
 * depender de cómo decida abreviar cada navegador.
 */
function marca(iso: string | null, conAnio: boolean): string {
  if (!iso) return '';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '';
  const { reloj, meridiano } = hora12(fecha.getHours() * 60 + fecha.getMinutes());
  // Sin el cero a la izquierda: aquí la hora se lee en una frase, no en una
  // columna que tenga que alinearse.
  const hora = `${reloj.replace(/^0/, '')} ${meridiano}`;
  const dia = `${fecha.getDate()} ${MESES_CORTOS[fecha.getMonth()]}`;
  return conAnio ? `${dia} ${fecha.getFullYear()}, ${hora}` : `${dia}, ${hora}`;
}
