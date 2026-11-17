import { api } from '@/lib/api';
import type { AdminRole, CuentaDelPanel } from '@/lib/types';

/** Cuentas del panel: la propia y, para un administrador, las de los demás. */

/** Datos de quien no está vinculado a un participante del padrón. */
export interface AccountOwnDetails {
  firstName?: string;
  paternalSurname?: string;
  maternalSurname?: string | null;
  phone?: string | null;
  congregation?: string | null;
}

export interface NewAccount extends AccountOwnDetails {
  email: string;
  password: string;
  role: AdminRole;
  participantId: string | null;
}

export interface AccountChanges extends AccountOwnDetails {
  email: string;
  role: AdminRole;
  active: boolean;
  participantId: string | null;
}

export function fetchOwnAccount(): Promise<CuentaDelPanel> {
  return api<CuentaDelPanel>('/me');
}

/** Cierra todas las sesiones, incluida la actual: hay que volver a entrar. */
export async function changeOwnPassword(current: string, password: string): Promise<void> {
  await api('/me/password', { method: 'POST', body: { current, password } });
}

export function fetchAccounts(): Promise<CuentaDelPanel[]> {
  return api<CuentaDelPanel[]>('/admin-users');
}

export async function createAccount(account: NewAccount): Promise<void> {
  await api('/admin-users', { method: 'POST', body: account });
}

export async function updateAccount(accountId: string, changes: AccountChanges): Promise<void> {
  await api(`/admin-users/${accountId}`, { method: 'PATCH', body: changes });
}

export async function resetAccountPassword(accountId: string, password: string): Promise<void> {
  await api(`/admin-users/${accountId}/password`, { method: 'POST', body: { password } });
}
