import { api } from '@/lib/api';
import type { Location, LocationSettings } from '@/lib/types';

/** Los puntos de exhibición: cuáles hay, su identidad y sus ajustes. */

export function fetchLocations(): Promise<Location[]> {
  return api<Location[]>('/locations');
}

/** Nombre y dirección; una dirección `null` la borra. */
export async function updateLocationIdentity(
  locationId: string,
  identity: { name: string; address: string | null },
): Promise<void> {
  await api<Location>(`/locations/${locationId}`, { method: 'PATCH', body: identity });
}

export function fetchLocationSettings(locationId: string): Promise<LocationSettings> {
  return api<LocationSettings>(`/locations/${locationId}/settings`);
}

export function updateLocationSettings(
  locationId: string,
  settings: LocationSettings,
): Promise<LocationSettings> {
  return api<LocationSettings>(`/locations/${locationId}/settings`, {
    method: 'PATCH',
    body: settings,
  });
}
