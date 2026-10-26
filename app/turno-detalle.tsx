'use client';

import type { DashboardShift, NeedLevel } from '@/lib/types';
import { fechaCorta, rangoTurno } from '@/lib/horas';
import { ocupacionTexto } from '@/lib/turnos';
import { MovimientosTurno } from './movimientos-turno';

export function claseNecesidad(need: NeedLevel): string {
  if (need === 'bajoMinimo' || need === 'cancelado') return 'critico';
  if (need === 'bajoCupo') return 'faltante';
  return 'completo';
}

interface Props {
  turno: DashboardShift;
  etiquetaDia: string;
  historialAbierto: boolean;
  onAlternarHistorial: () => void;
  onCancelar: (assignmentId: string, nombre: string) => void;
  onAgregar: () => void;
}

/**
 * Un turno con su gente y sus acciones.
 *
 * Vive aparte porque se muestra igual desde el detalle de un día del calendario
 * y desde la vista de lista: la información no debería cambiar según por dónde
 * se llegue a ella.
 */
export function TurnoDetalle({
  turno,
  etiquetaDia,
  historialAbierto,
  onAlternarHistorial,
  onCancelar,
  onAgregar,
}: Props) {
  const hayMovimientos =
    turno.cancellations.length > 0 || turno.participants.some((p) => p.origin === 'COVERAGE');

  return (
    // `details` en vez de estado propio: el navegador se encarga del teclado y
    // del anuncio de «contraído/expandido», y cada turno recuerda si está
    // abierto sin que el tablero tenga que llevar la cuenta.
    <details className={`turno ${turno.need}`}>
      <summary className="turno-cabecera">
        <strong>{rangoTurno(turno)}</strong>
        <span className={`etiqueta ${claseNecesidad(turno.need)}`}>
          {turno.status === 'CANCELLED'
            ? 'Turno cancelado'
            : ocupacionTexto(turno.occupied, turno.capacity)}
        </span>
        {/* El día va aquí dentro: cerrado, la cabecera es lo único que se lee. */}
        <span className="oculto-visualmente">{etiquetaDia}</span>
        <span className="chevron" aria-hidden="true" />
      </summary>

      <ul className="personas">
        {turno.participants.map((persona) => (
          <li key={persona.assignmentId}>
            <span className="nombre">
              {persona.name}
              {persona.confirmed && (
                <span className="marca" title="Confirmó su asistencia">
                  {' '}
                  ✓
                </span>
              )}
            </span>
            {persona.origin === 'COVERAGE' && (
              <span className="tenue detalle">
                cubre
                {persona.assignedAt && ` · registrado el ${fechaCorta(persona.assignedAt)}`}
                {persona.assignedByName && ` por ${persona.assignedByName}`}
                {/* La nota va en esta misma línea, no como distintivo aparte:
                    quien cubre sin estar en el padrón cuenta como cualquiera. */}
                {persona.note && ` · «${persona.note}»`}
              </span>
            )}
            <button
              className="accion"
              onClick={() => onCancelar(persona.assignmentId, persona.name)}
            >
              Cancelar
            </button>
          </li>
        ))}

        {turno.cancellations.map((baja) => (
          <li key={`${baja.participantId}-baja`} className="baja">
            <span className="nombre">{baja.name}</span>
            <span className="tenue detalle">
              canceló el {fechaCorta(baja.cancelledAt)}
              {baja.reasonCode && ` · ${baja.reasonCode}`}
              {baja.cancelledByName && ` · registró ${baja.cancelledByName}`}
              {baja.reason && ` · «${baja.reason}»`}
            </span>
          </li>
        ))}

        {turno.participants.length === 0 && turno.cancellations.length === 0 && (
          <li>
            <span className="tenue">Sin nadie asignado</span>
          </li>
        )}
      </ul>

      <div className="turno-pie">
        {(turno.freeSlots > 0 || turno.extraSlots > 0) && turno.status !== 'CANCELLED' && (
          <button onClick={onAgregar}>
            {turno.freeSlots === 0
              ? 'Agregar un extra'
              : turno.freeSlots === 1
                ? 'Agregar participante'
                : `Agregar (faltan ${turno.freeSlots})`}
          </button>
        )}
        {hayMovimientos && (
          <button className="enlace" onClick={onAlternarHistorial}>
            {historialAbierto ? 'Ocultar movimientos' : 'Ver movimientos'}
          </button>
        )}
      </div>

      {historialAbierto && <MovimientosTurno shiftId={turno.id} />}
    </details>
  );
}
