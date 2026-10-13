'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Window {
  id: string;
  weekday: number;
  startMinute: number;
  endMinute: number;
}

interface Supervisor {
  id: string;
  /** Nombre ya compuesto por el servidor, listo para mostrar. */
  fullName: string;
  phoneE164: string;
  onDuty: boolean;
  overrideActive: boolean;
  available: boolean | null;
  windows: Window[];
}

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

function horaTexto(minutos: number): string {
  return `${Math.floor(minutos / 60)}:${String(minutos % 60).padStart(2, '0')}`;
}

function aMinutos(valor: string): number {
  const [horas, minutos] = valor.split(':').map(Number);
  return horas * 60 + (minutos || 0);
}

/**
 * Las franjas de guardia de cada encargado.
 *
 * Se conserva igual que estaba: es la configuración de **cuándo** recibe
 * solicitudes, distinta de quién tiene cuenta. Queda plegada porque se toca una
 * vez y luego casi nunca.
 */
export function GuardiaDeEncargados({ locationId }: { locationId: string }) {
  const [supervisores, setSupervisores] = useState<Supervisor[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [nueva, setNueva] = useState<Record<string, { weekday: number; desde: string; hasta: string }>>({});

  const cargar = useCallback(async () => {
    setError(null);
    try {
      setSupervisores(await api<Supervisor[]>(`/locations/${locationId}/supervisors`));
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'No se pudieron cargar los encargados');
    }
  }, [locationId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function agregarFranja(supervisorId: string) {
    const datos = nueva[supervisorId] ?? { weekday: 1, desde: '08:00', hasta: '14:00' };
    setError(null);
    try {
      await api(`/locations/${locationId}/supervisors/${supervisorId}/windows`, {
        method: 'POST',
        body: {
          weekday: datos.weekday,
          startMinute: aMinutos(datos.desde),
          endMinute: aMinutos(datos.hasta),
        },
      });
      await cargar();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'No se pudo agregar la franja');
    }
  }

  async function quitarFranja(windowId: string) {
    try {
      await api(`/supervisors/windows/${windowId}`, { method: 'DELETE' });
      await cargar();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'No se pudo quitar la franja');
    }
  }

  return (
    <details className="tarjeta plegable" style={{ marginTop: '1rem' }}>
      <summary>
        Franjas de guardia
        <span className="etiqueta">{supervisores.length} encargado(s)</span>
      </summary>

      {error && <div className="aviso error">{error}</div>}

      <p className="tenue">
        Las franjas son el horario habitual en que cada encargado recibe solicitudes. Además,
        cualquiera puede conectarse o desconectarse desde WhatsApp en el momento; esa decisión
        manual gana sobre la franja mientras no expire.
      </p>

      {supervisores.map((supervisor) => {
        const datos = nueva[supervisor.id] ?? { weekday: 1, desde: '08:00', hasta: '14:00' };

        return (
          <div key={supervisor.id} className="tarjeta" style={{ marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <h3 style={{ marginBottom: '0.15rem' }}>{supervisor.fullName}</h3>
                <span className="tenue">{supervisor.phoneE164}</span>
              </div>
              <span className={`etiqueta ${supervisor.onDuty ? 'completo' : 'faltante'}`}>
                {supervisor.onDuty ? 'Recibiendo solicitudes' : 'Fuera de guardia'}
                {supervisor.overrideActive &&
                  ` · marcado a mano como ${supervisor.available ? 'disponible' : 'no disponible'}`}
              </span>
            </div>

            {supervisor.windows.length > 0 ? (
              <table style={{ marginTop: '0.75rem' }}>
                <tbody>
                  {supervisor.windows.map((window) => (
                    <tr key={window.id}>
                      <td style={{ textTransform: 'capitalize' }}>{DIAS[window.weekday]}</td>
                      <td>{horaTexto(window.startMinute)} a {horaTexto(window.endMinute)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button onClick={() => void quitarFranja(window.id)}>Quitar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="tenue" style={{ marginTop: '0.75rem' }}>
                Sin franjas habituales. Solo recibirá solicitudes cuando se conecte a mano.
              </p>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'end', marginTop: '0.75rem', flexWrap: 'wrap' }}>
              <label style={{ marginBottom: 0, width: 140 }}>
                <span>Día</span>
                <select
                  value={datos.weekday}
                  onChange={(event) =>
                    setNueva({
                      ...nueva,
                      [supervisor.id]: { ...datos, weekday: Number(event.target.value) },
                    })
                  }
                >
                  {DIAS.map((dia, indice) => (
                    <option key={dia} value={indice}>{dia}</option>
                  ))}
                </select>
              </label>
              <label style={{ marginBottom: 0, width: 120 }}>
                <span>Desde</span>
                <input
                  type="time"
                  value={datos.desde}
                  onChange={(event) =>
                    setNueva({ ...nueva, [supervisor.id]: { ...datos, desde: event.target.value } })
                  }
                />
              </label>
              <label style={{ marginBottom: 0, width: 120 }}>
                <span>Hasta</span>
                <input
                  type="time"
                  value={datos.hasta}
                  onChange={(event) =>
                    setNueva({ ...nueva, [supervisor.id]: { ...datos, hasta: event.target.value } })
                  }
                />
              </label>
              <button onClick={() => void agregarFranja(supervisor.id)}>Agregar franja</button>
            </div>
          </div>
        );
      })}

      {supervisores.length === 0 && (
        <div className="aviso atencion">
          Todavía no hay encargados. Da de alta una cuenta de encargado vinculada a alguien del
          padrón y aparecerá aquí.
        </div>
      )}
    </details>
  );
}
