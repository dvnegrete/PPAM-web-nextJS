/**
 * Qué hacer cuando la pestaña del navegador quedó abierta durante un despliegue.
 *
 * Cada sección del panel se descarga al abrirla, y los archivos llevan en el
 * nombre la versión con que se construyeron. Tras un despliegue, una pestaña
 * que ya estaba abierta pide los de su versión, que ya no existen. No es un
 * fallo que alguien pueda resolver reintentando: hay que volver a cargar el
 * panel para traer la versión nueva, y eso se hace solo.
 */

const RELOAD_AT_KEY = 'ppeam.stale-build.reload-at';
const TAB_KEY = 'ppeam.stale-build.tab';

/**
 * Si la recarga no arregla nada —sin conexión, o un fallo que no es de versión—
 * no se insiste: sin este margen el panel se recargaría en bucle.
 */
const RELOAD_COOLDOWN_MS = 30_000;

function read(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // Sin almacenamiento solo se pierde la comodidad de volver a la sección.
  }
}

function reloadedRecently(): boolean {
  const at = Number(read(RELOAD_AT_KEY));
  return Number.isFinite(at) && at > 0 && Date.now() - at < RELOAD_COOLDOWN_MS;
}

/**
 * Para el `catch` de la descarga de una sección: recarga el panel una vez.
 *
 * Mientras llega la recarga la promesa queda pendiente, de modo que se sigue
 * viendo «Cargando…» y no un error que desaparecería al instante. Si ya se
 * recargó hace un momento y volvió a fallar, el error sigue su camino.
 */
export function reloadOnStaleBuild(error: unknown): Promise<never> {
  if (typeof window === 'undefined' || reloadedRecently()) throw error;

  write(RELOAD_AT_KEY, String(Date.now()));
  window.location.reload();
  return new Promise<never>(() => {});
}

/** Anota la sección abierta, para volver a ella si hay que recargar. */
export function rememberTab(tabId: string): void {
  if (typeof window !== 'undefined') write(TAB_KEY, tabId);
}

/**
 * La sección que se estaba abriendo cuando el panel se recargó solo, o `null`
 * si esta carga es una entrada normal.
 */
export function tabAfterReload(): string | null {
  if (typeof window === 'undefined' || !reloadedRecently()) return null;
  return read(TAB_KEY);
}
