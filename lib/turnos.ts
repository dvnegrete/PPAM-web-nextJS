/**
 * Cómo se lee la ocupación de un turno.
 *
 * El cupo del turno es una **meta**, no un tope: el administrador puede sentar a
 * alguien por encima, hasta el máximo del punto. Eso obliga a que el texto
 * cambie según dónde esté la ocupación respecto a la meta:
 *
 * - Por debajo, «2/3» es lo útil: dice cuánto falta.
 * - Al alcanzarla, el cupo ya no es noticia; lo que importa es cuánta gente hay.
 * - Por encima, hay que nombrar el extra, o «4/3» parecería un error de captura
 *   o un cupo mal configurado.
 *
 * Vive aquí y no en un componente porque lo necesitan tres vistas —el detalle
 * del turno, la rejilla del mes y la pestaña Calendario— y si cada una lo
 * resolviera a su manera acabarían diciendo cosas distintas del mismo turno.
 */
export function ocupacionTexto(occupied: number, capacity: number): string {
  const extra = occupied - capacity;
  if (extra > 0) return `${occupied} personas · ${extra} extra`;
  if (extra === 0) return `${occupied} personas`;
  return `${occupied}/${capacity}`;
}
