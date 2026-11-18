'use client';

import { useCallback, useEffect, useState } from 'react';
import { errorMessage } from '@/lib/errors';
import { describeSlot } from '@/lib/recurring-slots';
import { appliedSummary } from '@/lib/recurring-sync';
import {
  addRecurringHolder,
  applyRecurringToUpcomingMonths,
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
  const [aplicando, setAplicando] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applySummary, setApplySummary] = useState<string | null>(null);

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
    setApplySummary(null);
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
      setApplySummary(null);
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

  /** Pone al día los meses próximos ya generados; dice si salió bien. */
  async function aplicar(): Promise<boolean> {
    setAplicando(true);
    setApplyError(null);
    try {
      const applied = await applyRecurringToUpcomingMonths(locationId);
      setApplySummary(appliedSummary(applied));
      await cargar();
      return true;
    } catch (problema) {
      setApplyError(errorMessage(problema, 'No se pudieron aplicar los turnos fijos'));
      return false;
    } finally {
      setAplicando(false);
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
    aplicando,
    applyError,
    applySummary,
    aplicar,
  };
}
