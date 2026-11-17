'use client';

import type { ReactNode } from 'react';
import { nombreFormal, nombreVisible } from '@/lib/nombres';
import { telefonoLegible } from '@/lib/texto';
import { MARITAL_LABELS, ROLE_LABELS, STATUS_LABELS } from '@/lib/types';
import type { Participant } from '@/lib/types';

export interface ParticipantListProps {
  participants: Participant[];
  /** Qué decir cuando no hay nadie que mostrar. */
  emptyState: ReactNode;
  onShowShifts: (participant: Participant) => void;
  onEdit: (participant: Participant) => void;
}

/** El padrón en escritorio: una tabla con todas las columnas. */
export function ParticipantsTable({
  participants,
  emptyState,
  onShowShifts,
  onEdit,
}: ParticipantListProps) {
  return (
    <div className="tarjeta padron-escritorio">
      <table className="padron-tabla">
        <thead>
          <tr>
            <th>Nombre</th>
            <th className="secundaria">Se muestra como</th>
            <th>Teléfono</th>
            <th>Rol</th>
            <th>Estado</th>
            <th>Congregación</th>
            <th className="secundaria">Circuito</th>
            <th className="secundaria">Ciudad</th>
            <th className="secundaria">Estado civil</th>
            <th className="secundaria">Cónyuge</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {participants.map((p) => (
            <tr key={p.id}>
              <td>{nombreFormal(p)}</td>
              <td className="secundaria">
                {p.displayName ? p.displayName : <span className="tenue">{nombreVisible(p)}</span>}
              </td>
              <td style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                {telefonoLegible(p.phoneE164)}
              </td>
              <td>
                {p.role === 'PARTICIPANT' ? (
                  ROLE_LABELS[p.role]
                ) : (
                  <span className="etiqueta completo">{ROLE_LABELS[p.role]}</span>
                )}
              </td>
              <td>
                {p.status === 'ACTIVE' ? (
                  <span className="tenue">{STATUS_LABELS[p.status]}</span>
                ) : (
                  <span className={`etiqueta ${p.status === 'PAUSED' ? 'faltante' : 'critico'}`}>
                    {STATUS_LABELS[p.status]}
                  </span>
                )}
              </td>
              <td>{p.congregation ?? <span className="tenue">—</span>}</td>
              <td className="secundaria">{p.circuit ?? <span className="tenue">—</span>}</td>
              <td className="secundaria">{p.city ?? <span className="tenue">—</span>}</td>
              <td className="secundaria">
                {p.maritalStatus === 'SIN_REGISTRAR' ? (
                  <span className="tenue">Sin registrar</span>
                ) : (
                  MARITAL_LABELS[p.maritalStatus]
                )}
              </td>
              <td className="secundaria">
                {p.spouse ? (
                  <>
                    {nombreVisible(p.spouse)}
                    <span className="tenue"> · participa</span>
                  </>
                ) : p.spouseName ? (
                  <>
                    {p.spouseName}
                    <span className="tenue"> · no participa</span>
                  </>
                ) : (
                  <span className="tenue">—</span>
                )}
              </td>
              <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                <button className="accion" onClick={() => onShowShifts(p)}>
                  Turnos
                </button>{' '}
                <button className="accion" onClick={() => onEdit(p)}>
                  Editar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {emptyState}
    </div>
  );
}
