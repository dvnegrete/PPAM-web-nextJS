'use client';

import { nombreFormal, nombreVisible } from '@/lib/nombres';
import { initials } from '@/lib/participant-directory';
import { telefonoLegible } from '@/lib/texto';
import { ROLE_LABELS, STATUS_LABELS } from '@/lib/types';
import type { ParticipantListProps } from './participants-table';

interface Props extends ParticipantListProps {
  /** Cuántas personas tiene el padrón entero, se vean o no. */
  total: number;
  /** La lista está desplegada: hay búsqueda, hay filtro o se pidió verla. */
  open: boolean;
  /** Se pidió ver a todos y no hay búsqueda ni filtro: se puede volver a ocultar. */
  canHide: boolean;
  onShowAll: (show: boolean) => void;
}

/**
 * El padrón en el teléfono, en fichas en vez de tabla: once columnas no caben
 * sin desplazarse de lado, y una ficha deja los dos botones al alcance.
 *
 * La lista no se pinta hasta que se busca o se pide: ciento treinta fichas de
 * entrada son un desplazamiento que nadie quiere recorrer.
 */
export function ParticipantCards({
  participants,
  emptyState,
  onShowShifts,
  onEdit,
  total,
  open,
  canHide,
  onShowAll,
}: Props) {
  return (
    <div className="padron-telefono">
      {!open && total > 0 ? (
        <div className="padron-invitacion">
          <p>
            Escribe un nombre o un teléfono para encontrar a alguien y ver{' '}
            <strong>qué turnos cubre</strong>.
          </p>
          <button onClick={() => onShowAll(true)}>Ver los {total} participantes</button>
        </div>
      ) : (
        <>
          <ul className="padron-fichas">
            {participants.map((p) => (
              <li key={p.id} className="ficha">
                <div className="ficha-cabecera">
                  <span className="ficha-iniciales" aria-hidden="true">
                    {initials(p)}
                  </span>
                  <div className="ficha-quien">
                    <strong>{nombreFormal(p)}</strong>
                    <a href={`tel:${p.phoneE164}`}>{telefonoLegible(p.phoneE164)}</a>
                  </div>
                </div>
                <div className="ficha-datos">
                  {p.role !== 'PARTICIPANT' && (
                    <span className="etiqueta completo">{ROLE_LABELS[p.role]}</span>
                  )}
                  {p.status !== 'ACTIVE' && (
                    <span className={`etiqueta ${p.status === 'PAUSED' ? 'faltante' : 'critico'}`}>
                      {STATUS_LABELS[p.status]}
                    </span>
                  )}
                  {p.congregation && <span className="etiqueta">{p.congregation}</span>}
                  {(p.spouse || p.spouseName) && (
                    <span className="etiqueta">
                      Cónyuge: {p.spouse ? nombreVisible(p.spouse) : p.spouseName}
                    </span>
                  )}
                </div>
                <div className="ficha-acciones">
                  <button className="primario" onClick={() => onShowShifts(p)}>
                    Ver turnos
                  </button>
                  <button onClick={() => onEdit(p)}>Editar</button>
                </div>
              </li>
            ))}
          </ul>
          {emptyState}
          {canHide && (
            <button className="padron-ocultar" onClick={() => onShowAll(false)}>
              Ocultar la lista
            </button>
          )}
        </>
      )}
    </div>
  );
}
