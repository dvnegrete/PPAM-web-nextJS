'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Movement } from '@/lib/types';
import { fechaCorta } from './turno-detalle';

/**
 * Recorrido completo de un turno.
 *
 * Se lee de la bitácora y no del estado actual, así que conserva también a quien
 * canceló y después fue reemplazado por otra persona: esa historia ya no aparece
 * en el turno, pero es justo la que suele preguntarse después.
 */
export function MovimientosTurno({ shiftId }: { shiftId: string }) {
  const [movimientos, setMovimientos] = useState<Movement[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    api<Movement[]>(`/shifts/${shiftId}/history`)
      .then((lista) => {
        if (vigente) setMovimientos(lista);
      })
      .catch((problema: unknown) => {
        if (vigente) {
          setError(problema instanceof Error ? problema.message : 'No se pudo cargar el historial');
        }
      });
    return () => {
      vigente = false;
    };
  }, [shiftId]);

  if (error) return <p className="aviso error">{error}</p>;
  if (!movimientos) return <p className="tenue">Cargando movimientos…</p>;
  if (movimientos.length === 0) return <p className="tenue">Sin movimientos registrados.</p>;

  return (
    <ol className="historial">
      {movimientos.map((movimiento) => (
        <li key={movimiento.id}>
          <span className="cuando">{fechaCorta(movimiento.at)}</span>
          <span>
            {movimiento.description}
            <span className="tenue"> · registró {movimiento.by}</span>
            {movimiento.reason && <span className="tenue"> · «{movimiento.reason}»</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}
