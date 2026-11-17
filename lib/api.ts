'use client';

const TOKEN_KEY = 'ppeam.admin.token';
const NAME_KEY = 'ppeam.admin.name';

export interface Session {
  token: string;
  name: string;
}

export function getSession(): Session | null {
  if (typeof window === 'undefined') return null;
  const token = window.localStorage.getItem(TOKEN_KEY);
  const name = window.localStorage.getItem(NAME_KEY);
  return token ? { token, name: name ?? '' } : null;
}

export function saveSession(session: Session): void {
  window.localStorage.setItem(TOKEN_KEY, session.token);
  window.localStorage.setItem(NAME_KEY, session.name);
}

export function clearSession(): void {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(NAME_KEY);
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/**
 * El servidor se duerme cuando pasa un rato sin peticiones y tarda unos
 * segundos en volver. Mientras arranca, el proxy contesta con un error de
 * pasarela o no contesta: eso no es un fallo que deba ver quien usa el panel,
 * solo hay que esperar y volver a pedir.
 */
const WAKE_TIMEOUT_MS = 60_000;
const WAKE_RETRY_DELAY_MS = 1_500;
/** Pasado este rato sin respuestas se da por hecho que pudo dormirse. */
const IDLE_BEFORE_WAKE_CHECK_MS = 5 * 60_000;

const UNREACHABLE_MESSAGE =
  'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.';
const UNCONFIRMED_WRITE_MESSAGE =
  'Se perdió la conexión con el servidor antes de recibir respuesta. ' +
  'Actualiza la pantalla y comprueba si el cambio se guardó antes de repetirlo.';

let lastResponseAt = 0;
let wakeInProgress: Promise<boolean> | null = null;

/**
 * Una respuesta que no viene del servidor sino de lo que hay delante: la
 * plataforma (502, 503, 504) o el proxy de Next, que ante un destino caído
 * devuelve un 500 de texto plano. Los errores propios del servidor son JSON.
 */
function isGatewayFailure(response: Response): boolean {
  if ([502, 503, 504].includes(response.status)) return true;
  const isJson = response.headers.get('content-type')?.includes('application/json') ?? false;
  return response.status === 500 && !isJson;
}

/** Una petición; `null` si el servidor no llegó a contestar. */
async function attempt(url: string, init: RequestInit): Promise<Response | null> {
  try {
    const response = await fetch(url, init);
    if (isGatewayFailure(response)) return null;
    lastResponseAt = Date.now();
    return response;
  } catch {
    return null;
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Insiste hasta que el servidor contesta algo, lo que sea: sin token responde
 * 401 de inmediato, y eso ya prueba que está despierto. Las llamadas
 * simultáneas comparten la misma espera.
 */
function wakeServer(): Promise<boolean> {
  wakeInProgress ??= (async () => {
    const deadline = Date.now() + WAKE_TIMEOUT_MS;
    while (Date.now() < deadline) {
      if (await attempt('/api/admin/me', { method: 'GET' })) return true;
      await wait(WAKE_RETRY_DELAY_MS);
    }
    return false;
  })().finally(() => {
    wakeInProgress = null;
  });
  return wakeInProgress;
}

/**
 * `fetch` que espera a que el servidor despierte.
 *
 * Una lectura se puede repetir sin riesgo, así que si no hubo respuesta se
 * espera al servidor y se vuelve a pedir. Un cambio no: si se perdió a medio
 * camino no se sabe si llegó a aplicarse. Por eso, antes de enviar un cambio
 * tras un rato de inactividad, primero se despierta al servidor, y el cambio se
 * manda una sola vez.
 */
async function fetchWhenAwake(url: string, init: RequestInit): Promise<Response> {
  const isRead = (init.method ?? 'GET') === 'GET';

  if (!isRead && Date.now() - lastResponseAt > IDLE_BEFORE_WAKE_CHECK_MS) {
    if (!(await wakeServer())) throw new ApiError(UNREACHABLE_MESSAGE, 503);
  }

  let response = await attempt(url, init);
  if (!response && isRead && (await wakeServer())) {
    response = await attempt(url, init);
  }
  if (!response) {
    throw new ApiError(isRead ? UNREACHABLE_MESSAGE : UNCONFIRMED_WRITE_MESSAGE, 503);
  }
  return response;
}

/** Llama a la API del panel adjuntando el token de sesión. */
export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const session = getSession();

  const response = await fetchWhenAwake(`/api/admin${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(session ? { Authorization: `Bearer ${session.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 401) {
    clearSession();
    throw new ApiError('Tu sesión expiró. Vuelve a entrar.', 401);
  }

  if (response.status === 403) {
    // El mensaje del servidor dice el motivo real —falta de nivel, o una
    // contraseña pendiente de cambiar— y es más útil que uno genérico.
    const detalle = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new ApiError(detalle?.message ?? 'No tienes permiso para esto', 403);
  }

  if (response.status === 429) {
    throw new ApiError('Demasiados intentos. Espera un minuto y vuelve a probar.', 429);
  }

  const data = (await response.json().catch(() => null)) as
    | { message?: string | string[] }
    | null;

  if (!response.ok) {
    const detail = Array.isArray(data?.message)
      ? data.message.join(', ')
      : (data?.message ?? 'Ocurrió un error inesperado');
    throw new ApiError(detail, response.status);
  }

  return data as T;
}

export async function login(email: string, password: string): Promise<Session> {
  const response = await fetchWhenAwake('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = (await response.json().catch(() => null)) as
    | { token?: string; name?: string; message?: string }
    | null;

  if (!response.ok || !data?.token) {
    throw new ApiError(data?.message ?? 'No se pudo iniciar sesión', response.status);
  }

  return { token: data.token, name: data.name ?? '' };
}
