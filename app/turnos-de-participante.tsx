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

/** Clase de color de cada origen: un vistazo basta para distinguirlos. */
const TIPO: Record<TurnoProximoDeParticipante['origin'], string> = {
  FIXED: 'fijo',
  COVERAGE: 'sustitucion',
  SIGNUP: 'inscripcion',
  MANUAL: 'manual',
};

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** «AL» para «Ana López». */
function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/);
  return `${partes[0]?.charAt(0) ?? ''}${partes[1]?.charAt(0) ?? ''}`.toLocaleUpperCase('es-MX');
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
        <div className="dialogo dialogo-ancho dialogo-turnos">
          <header className="turnos-quien">
            <span className="ficha-iniciales" aria-hidden="true">
              {iniciales(turnos?.participant.name ?? nombre)}
            </span>
            <div className="ficha-quien">
              <h3>{turnos?.participant.name ?? nombre}</h3>
              {turnos && <span>{turnos.participant.phone}</span>}
            </div>
            <button className="turnos-cerrar" onClick={onCerrar} aria-label="Cerrar">
              ×
            </button>
          </header>

          {error && <div className="aviso error">{error}</div>}
          {aviso && <div className="aviso exito">{aviso}</div>}
          {!turnos && !error && <p className="tenue">Cargando…</p>}

          {turnos && (
            <>
              <section className="turnos-seccion fijos">
                <h4>
                  Turnos fijos
                  <span className="turnos-cuenta">{turnos.fixed.length}</span>
                </h4>
                <p className="turnos-nota">Lo que le toca siempre, mes con mes.</p>
                {turnos.fixed.length === 0 ? (
                  <p className="turnos-vacio">No tiene turnos fijos.</p>
                ) : (
                  <ul className="turnos-lista">
                    {turnos.fixed.map((fijo) => (
                      <li key={`${fijo.label}-${fijo.range}`} className="turno-fijo">
                        <strong>{fijo.label}</strong>
                        <span className="turno-hora">{fijo.range}</span>
                        {fijo.isCaptain && <span className="turno-marca capitan">Capitán</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="turnos-seccion proximos">
                <h4>
                  Próximos turnos
                  <span className="turnos-cuenta">{vigentes}</span>
                </h4>
                <p className="turnos-nota">Fechas ya registradas, de hoy en adelante.</p>
                {turnos.upcoming.length === 0 ? (
                  <p className="turnos-vacio">
                    Sin turnos próximos registrados. Las fechas de un mes aparecen cuando se
                    genera en Calendario.
                  </p>
                ) : (
                  <ul className="turnos-lista">
                    {turnos.upcoming.map((turno) => {
                      const tipo = turno.cancelled ? 'cancelado' : TIPO[turno.origin];
                      const [, mes, dia] = turno.date.split('-');
                      return (
                        <li key={turno.assignmentId} className={`turno-fecha ${tipo}`}>
                          <span className="turno-dia" aria-hidden="true">
                            <span className="numero">{Number(dia)}</span>
                            <span className="mes">{MESES[Number(mes) - 1]}</span>
                          </span>
                          <div className="turno-cuerpo">
                            <div className="turno-titulo">
                              <strong>{turno.label}</strong>
                              <span className="turno-marca">
                                {turno.cancelled ? 'Ya canceló' : ORIGEN[turno.origin]}
                              </span>
                              {turno.isCaptain && (
                                <span className="turno-marca capitan">Capitán</span>
                              )}
                            </div>
                            <div className="turno-hora">{turno.range}</div>
                            <div className="turno-con">
                              {turno.cancelled
                                ? `Motivo: ${turno.cancelReason ?? 'sin anotar'}`
                                : turno.companions.length > 0
                                  ? `Con ${turno.companions.join(', ')}`
                                  : 'Nadie más en este turno'}
                            </div>
                          </div>
                          {!turno.cancelled && (
                            <button className="accion" onClick={() => setCancelando(turno)}>
                              Cancelar
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </>
          )}
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
