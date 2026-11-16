'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  CANCEL_REASONS,
  type TurnoProximoDeParticipante,
  type TurnosDeParticipante as Turnos,
} from '@/lib/types';
import { CancelarDialogo } from './cancelar-dialogo';

interface Props {
  locationId: string;
  participanteId: string;
  /** Se muestra mientras llega la respuesta, para que el diálogo no abra vacío. */
  nombre: string;
  onCerrar: () => void;
}

const ORIGEN: Record<TurnoProximoDeParticipante['origin'], string> = {
  FIXED: 'Fijo',
  COVERAGE: 'Sustitución',
  SIGNUP: 'Inscripción',
  MANUAL: 'Agregado a mano',
};

/**
 * «¿Qué turnos cubre tal persona?»
 *
 * Responde sin recorrer el Tablero ni la rejilla de Turnos fijos: arriba lo que
 * le toca siempre y abajo las fechas que ya tiene registradas, sustituciones
 * incluidas. Desde aquí mismo se cancela, porque la pregunta casi siempre llega
 * con un «está enfermo, no va a poder».
 */
export function TurnosDeParticipante({ locationId, participanteId, nombre, onCerrar }: Props) {
  const [turnos, setTurnos] = useState<Turnos | null>(null);
  const [cancelando, setCancelando] = useState<TurnoProximoDeParticipante | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      setTurnos(
        await api<Turnos>(`/locations/${locationId}/participants/${participanteId}/shifts`),
      );
    } catch (problema) {
      setError(problema instanceof Error ? problema.message : 'No se pudieron cargar los turnos');
    }
  }, [locationId, participanteId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  // Con el diálogo de baja encima, Escape es suyo: cerrar los dos de un golpe
  // dejaría la duda de si la cancelación se registró.
  useEffect(() => {
    if (cancelando) return;
    function alTeclear(evento: KeyboardEvent) {
      if (evento.key === 'Escape') onCerrar();
    }
    document.addEventListener('keydown', alTeclear);
    return () => document.removeEventListener('keydown', alTeclear);
  }, [cancelando, onCerrar]);

  async function cancelar(reasonCode: string, reason: string, tambienConyuge: boolean) {
    if (!cancelando) return;
    const { spouseCancelled } = await api<{ ok: true; spouseCancelled: string | null }>(
      `/assignments/${cancelando.assignmentId}/cancel`,
      {
        method: 'POST',
        body: { reasonCode, reason: reason || undefined, cancelSpouse: tambienConyuge },
      },
    );
    setAviso(
      spouseCancelled
        ? `Se cancelaron los turnos de ${nombre} y ${spouseCancelled} del ${cancelando.label}.`
        : `Se canceló el turno del ${cancelando.label}.`,
    );
    setCancelando(null);
    await cargar();
  }

  const vigentes = turnos?.upcoming.filter((turno) => !turno.cancelled).length ?? 0;

  return (
    <>
      <div
        className="telon"
        role="dialog"
        aria-modal="true"
        aria-label={`Turnos de ${nombre}`}
        onMouseDown={(evento) => {
          if (evento.target === evento.currentTarget) onCerrar();
        }}
      >
        <div className="dialogo dialogo-ancho">
          <h3>Turnos de {turnos?.participant.name ?? nombre}</h3>
          {turnos && (
            <p className="tenue" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {turnos.participant.phone}
            </p>
          )}

          {error && <div className="aviso error">{error}</div>}
          {aviso && <div className="aviso exito">{aviso}</div>}
          {!turnos && !error && <p className="tenue">Cargando…</p>}

          {turnos && (
            <>
              <h4 className="turnos-persona-titulo">Turnos fijos</h4>
              {turnos.fixed.length === 0 ? (
                <p className="tenue">No tiene turnos fijos.</p>
              ) : (
                <ul className="turnos-persona">
                  {turnos.fixed.map((fijo) => (
                    <li key={`${fijo.label}-${fijo.range}`}>
                      <div className="turnos-persona-cuando">
                        <strong>{fijo.label}</strong>
                        <span>{fijo.range}</span>
                        {fijo.isCaptain && <span className="etiqueta completo">Capitán</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <h4 className="turnos-persona-titulo">
                Próximos turnos
                {vigentes > 0 && <span className="tenue"> · {vigentes}</span>}
              </h4>
              {turnos.upcoming.length === 0 ? (
                <p className="tenue">
                  Sin turnos próximos registrados. Las fechas de un mes aparecen cuando se genera
                  en Calendario.
                </p>
              ) : (
                <ul className="turnos-persona">
                  {turnos.upcoming.map((turno) => (
                    <li key={turno.assignmentId} className={turno.cancelled ? 'cancelado' : ''}>
                      <div className="turnos-persona-cuando">
                        <strong>{turno.label}</strong>
                        <span>{turno.range}</span>
                        {turno.cancelled ? (
                          <span className="etiqueta critico">Ya canceló</span>
                        ) : (
                          <>
                            <span
                              className={`etiqueta ${turno.origin === 'FIXED' ? '' : 'faltante'}`}
                            >
                              {ORIGEN[turno.origin]}
                            </span>
                            {turno.isCaptain && <span className="etiqueta completo">Capitán</span>}
                          </>
                        )}
                      </div>
                      <div className="turnos-persona-detalle tenue">
                        {turno.cancelled
                          ? (turno.cancelReason ?? 'Sin motivo anotado')
                          : turno.companions.length > 0
                            ? `Con ${turno.companions.join(', ')}`
                            : 'Nadie más en este turno'}
                      </div>
                      {!turno.cancelled && (
                        <button className="accion" onClick={() => setCancelando(turno)}>
                          Cancelar
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          <div className="dialogo-acciones">
            <button onClick={onCerrar}>Cerrar</button>
          </div>
        </div>
      </div>

      {cancelando && (
        <CancelarDialogo
          nombre={turnos?.participant.name ?? nombre}
          turno={`${cancelando.label}, ${cancelando.range}`}
          motivos={CANCEL_REASONS}
          conyuge={cancelando.spouseName}
          onCancelar={cancelar}
          onCerrar={() => setCancelando(null)}
        />
      )}
    </>
  );
}
