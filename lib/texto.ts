/**
 * Comparación de texto para buscar, espejo de `clave()` del servidor
 * (`server/src/participants/organization-fields.service.ts`).
 *
 * El padrón está escrito con acentos, como debe ser, pero nadie los teclea al
 * buscar: sin normalizar, «lopez» no encontraría a ningún «López» y el buscador
 * parecería roto. Y los teléfonos se guardan en E.164 sin separadores
 * (`+525512345678`) mientras la gente los lee y los escribe por bloques
 * («55 1234 5678»), así que tampoco coinciden tal cual.
 */

/** Sin acentos, sin mayúsculas, sin espacios de más. */
export function clave(valor: string | null | undefined): string {
  return (valor ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('es-MX')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/** Solo los dígitos, para que «55 1234» encuentre «+525512345678». */
export function digitos(valor: string | null | undefined): string {
  return (valor ?? '').replace(/\D/g, '');
}

/** Lo que se busca, ya preparado: el texto normalizado y los dígitos aparte. */
export interface Buscable {
  texto: string;
  digitos: string;
}

/** Parte la consulta en términos normalizados; vacía si no hay nada que buscar. */
export function terminos(consulta: string): string[] {
  const limpia = clave(consulta);
  return limpia ? limpia.split(' ') : [];
}

/**
 * ¿Aciertan **todos** los términos?
 *
 * Exigir todos y no cualquiera es lo que hace útil escribir dos palabras: «ana
 * lopez» debe reducir la lista, no ampliarla con todas las Anas y todos los
 * López. Cada término puede acertar por cualquier campo y en cualquier orden,
 * porque quien busca no se acuerda de en qué columna estaba el dato.
 */
export function coincide(terms: string[], buscable: Buscable): boolean {
  return terms.every((termino) => {
    if (buscable.texto.includes(termino)) return true;
    // Un término de dígitos se compara contra el teléfono: así «7894» encuentra
    // por los últimos cuatro, que es como la gente identifica un número.
    const soloDigitos = digitos(termino);
    return soloDigitos.length > 0 && buscable.digitos.includes(soloDigitos);
  });
}
