'use client';

import { useCallback, useEffect, useState } from 'react';
import { errorMessage } from '@/lib/errors';
import { describeSlot } from '@/lib/recurring-slots';
import {
  addRecurringHolder,
  fetchRecurringCandidates,
  fetchRecurringOverview,
  removeRecurringHolder,
  setRecurringCaptain,
} from '@/lib/services/recurring';
import type { RecurringOverview, RecurringSlot } from '@/lib/types';
import type { PendingRemoval } from './recurring-removal-dialog';

/**
 * El estado de la pantalla de turnos fijos y lo que se puede hacer en ella.
 *
 * La pantalla solo pinta: qué se carga, cuándo se recarga y qué se le dice a la
 * persona cuando algo falla se decide aquí.
 */
export function useRecurringSlots(locationId: string) {
  const [datos, setDatos] = useState<RecurringOverview | null>(null);
  const [eligiendo, setEligiendo] = useState<RecurringSlot | null>(null);
  const [quitando, setQuitando] = useState<string | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<PendingRemoval | null>(null);
  const [marcando, setMarcando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    try {
      setDatos(await fetchRecurringOverview(locationId));
      setError(null);
    } catch (problema) {
      setError(errorMessage(problema, 'No se pudieron cargar los turnos fijos'));
    } finally {
      setCargando(false);
    }
  }, [locationId]);

  useEffect(() => {
    setCargando(true);
    void cargar();
  }, [cargar]);

  async function agregar(templateId: string, participantId: string) {
    await addRecurringHolder(locationId, templateId, participantId);
    setEligiendo(null);
    await cargar();
  }

  /** Abre la confirmación con el nombre y la franja, para que se lea a quién se quita. */
  function requestRemoval(recurringId: string) {
    for (const slot of datos?.slots ?? []) {
      const holder = slot.holders.find((item) => item.recurringId === recurringId);
      if (holder) {
        setPendingRemoval({ recurringId, name: holder.name, when: describeSlot(slot) });
        return;
      }
    }
  }

  async function quitar(recurringId: string) {
    setQuitando(recurringId);
    setError(null);
    try {
      await removeRecurringHolder(recurringId);
      setPendingRemoval(null);
      await cargar();
    } catch (problema) {
      setError(errorMessage(problema, 'No se pudo quitar'));
    } finally {
      setQuitando(null);
    }
  }

  /** Marcar a uno como capitán le quita la marca al anterior: lo resuelve el servidor. */
  async function marcarCapitan(recurringId: string, isCaptain: boolean) {
    setMarcando(recurringId);
    setError(null);
    try {
      await setRecurringCaptain(recurringId, isCaptain);
      await cargar();
    } catch (problema) {
      setError(errorMessage(problema, 'No se pudo marcar al capitán'));
    } finally {
      setMarcando(null);
    }
  }

  const cargarCandidatos = useCallback(
    (templateId: string) => () => fetchRecurringCandidates(locationId, templateId),
    [locationId],
  );

  return {
    datos,
    cargando,
    error,
    eligiendo,
    setEligiendo,
    quitando,
    marcando,
    pendingRemoval,
    requestRemoval,
    cancelRemoval: () => setPendingRemoval(null),
    quitar,
    agregar,
    marcarCapitan,
    cargarCandidatos,
  };
}
