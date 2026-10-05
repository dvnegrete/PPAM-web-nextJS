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

/** Llama a la API del panel adjuntando el token de sesión. */
export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const session = getSession();

  const response = await fetch(`/api/admin${path}`, {
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
  const response = await fetch('/api/admin/login', {
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
