'use client';

import { useCallback, useEffect, useState } from 'react';
import { cancelAssignment } from '@/lib/services/assignments';
import { fetchParticipantShifts, updateParticipant } from '@/lib/services/participants';
import {
  CANCEL_REASONS,
  type ParticipantStatus,
  type TurnoProximoDeParticipante,
  type TurnosDeParticipante as Turnos,
} from '@/lib/types';
import { CancelarDialogo } from './cancelar-dialogo';
import { MONTH_ABBREVIATIONS } from '@/lib/calendar-labels';

interface Props {
  locationId: string;
  participanteId: string;
  /** Se muestra mientras llega la respuesta, para que el diálogo no abra vacío. */
  nombre: string;
  status: ParticipantStatus;
  /** Algo cambió en la persona (una baja): la lista de afuera debe recargarse. */
  onChanged: () => void;
  onCerrar: () => void;
}

/** Clase de color de cada origen: un vistazo basta para distinguirlos. */
const TIPO: Record<TurnoProximoDeParticipante['origin'], string> = {
  FIXED: 'fijo',
  COVERAGE: 'sustitucion',
  SIGNUP: 'inscripcion',
  MANUAL: 'manual',
};

/** Hasta cuántas fechas se muestran abiertas; con más, la lista entra plegada. */
const MAX_UPCOMING_OPEN = 4;

/** «1 turno fijo», «3 turnos fijos». */
function countLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

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
export function TurnosDeParticipante({
  locationId,
  participanteId,
  nombre,
  status,
  onChanged,
  onCerrar,
}: Props) {
  const [turnos, setTurnos] = useState<Turnos | null>(null);
  const [cancelando, setCancelando] = useState<TurnoProximoDeParticipante | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState(status);
  const [confirmingRemoval, setConfirmingRemoval] = useState(false);
  const [removing, setRemoving] = useState(false);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      setTurnos(
        await fetchParticipantShifts(locationId, participanteId),
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
    if (cancelando || confirmingRemoval) return;
    function alTeclear(evento: KeyboardEvent) {
      if (evento.key === 'Escape') onCerrar();
    }
    document.addEventListener('keydown', alTeclear);
    return () => document.removeEventListener('keydown', alTeclear);
  }, [cancelando, confirmingRemoval, onCerrar]);

  async function cancelar(reasonCode: string, reason: string, tambienConyuge: boolean) {
    if (!cancelando) return;
    const { spouseCancelled } = await cancelAssignment(cancelando.assignmentId, {
      reasonCode,
      reason: reason || undefined,
      cancelSpouse: tambienConyuge,
    });
    setAviso(
      spouseCancelled
        ? `Se cancelaron los turnos de ${nombre} y ${spouseCancelled} del ${cancelando.label}.`
        : `Se canceló el turno del ${cancelando.label}.`,
    );
    setCancelando(null);
    await cargar();
  }

  /**
   * Baja definitiva: un solo paso que da de baja a la persona, quita sus turnos
   * fijos y libera sus fechas próximas. Lo hace el servidor al cambiar el estado.
   */
  async function removePermanently() {
    setRemoving(true);
    setError(null);
    try {
      const result = await updateParticipant(locationId, participanteId, { status: 'INACTIVE' });
      setCurrentStatus('INACTIVE');
      setConfirmingRemoval(false);
      setAviso(
        `${nombre} quedó de baja. ` +
          `${countLabel(result.removedFixedShifts, 'turno fijo quitado', 'turnos fijos quitados')} y ` +
          `${countLabel(result.cancelledShifts, 'turno próximo liberado', 'turnos próximos liberados')}, ` +
          'sin convocar a nadie.',
      );
      onChanged();
      await cargar();
    } catch (problema) {
      setError(problema instanceof Error ? problema.message : 'No se pudo dar de baja');
      setConfirmingRemoval(false);
    } finally {
      setRemoving(false);
    }
  }

  const vigentes = turnos?.upcoming.filter((turno) => !turno.cancelled).length ?? 0;
  const fixedCount = turnos?.fixed.length ?? 0;

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
              {/* Plegables: con muchas fechas, la baja definitiva quedaba al fondo
                  de un desplazamiento largo y no se sabía que existía. */}
              <details className="turnos-seccion fijos" open>
                <summary>
                  Turnos fijos
                  <span className="turnos-cuenta">{turnos.fixed.length}</span>
                </summary>
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
              </details>

              <details
                className="turnos-seccion proximos"
                open={turnos.upcoming.length <= MAX_UPCOMING_OPEN}
              >
                <summary>
                  Próximos turnos
                  <span className="turnos-cuenta">{vigentes}</span>
                </summary>
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
                            <span className="mes">{MONTH_ABBREVIATIONS[Number(mes) - 1]}</span>
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
              </details>

              <section className="permanent-removal">
                {currentStatus === 'INACTIVE' ? (
                  <p className="tenue">
                    Esta persona está <strong>dada de baja</strong>. Para que vuelva, cambia su
                    estado en «Editar» y asígnale de nuevo sus turnos fijos.
                  </p>
                ) : (
                  <>
                    <div>
                      <h4>Baja definitiva</h4>
                      <p className="tenue">
                        Si ya no va a participar: la da de baja, quita sus turnos fijos y libera
                        sus turnos próximos, todo de una vez.
                      </p>
                    </div>
                    <button className="danger" onClick={() => setConfirmingRemoval(true)}>
                      Dar de baja y liberar todos sus turnos
                    </button>
                  </>
                )}
              </section>
            </>
          )}
        </div>
      </div>

      {confirmingRemoval && (
        <div
          className="telon"
          role="alertdialog"
          aria-modal="true"
          aria-label="Baja definitiva"
        >
          <div className="dialogo">
            <h3>¿Dar de baja a {turnos?.participant.name ?? nombre}?</h3>
            <p>Se hará todo esto de una vez:</p>
            <ul className="removal-summary">
              <li>
                Queda como <strong>«Dado de baja»</strong> en Participantes.
              </li>
              <li>
                Se quitan <strong>{countLabel(fixedCount, 'turno fijo', 'turnos fijos')}</strong>:
                su lugar queda libre para otro titular.
              </li>
              <li>
                Se liberan{' '}
                <strong>{countLabel(vigentes, 'turno próximo', 'turnos próximos')}</strong>, sin
                convocar a nadie: los huecos quedan visibles en el Tablero.
              </li>
              <li>Deja de salir en el Rol del mes.</li>
            </ul>
            <p className="tenue">Los turnos que ya atendió no se tocan.</p>
            <div className="dialogo-acciones">
              <button onClick={() => setConfirmingRemoval(false)} disabled={removing} autoFocus>
                No, conservar
              </button>
              <button
                className="danger"
                onClick={() => void removePermanently()}
                disabled={removing}
              >
                {removing ? 'Dando de baja…' : 'Sí, dar de baja'}
              </button>
            </div>
          </div>
        </div>
      )}

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
