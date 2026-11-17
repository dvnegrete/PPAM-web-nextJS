'use client';

/** A quién se está por quitar y de qué franja, para decirlo en la confirmación. */
export interface PendingRemoval {
  recurringId: string;
  name: string;
  when: string;
}

interface Props {
  pending: PendingRemoval;
  /** Se está quitando: los botones esperan. */
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Quitar pide confirmación: la «×» queda junto a la casilla del capitán y un
 * toque en falso dejaría a alguien sin su turno en los meses siguientes.
 */
export function RecurringRemovalDialog({ pending, busy, error, onCancel, onConfirm }: Props) {
  return (
    <div className="telon" role="alertdialog" aria-modal="true" aria-label="Quitar turno fijo">
      <div className="dialogo">
        <h3>¿Por favor confirma que deseas eliminar este turno fijo?</h3>
        <p>
          <strong>{pending.name}</strong> dejará de ser titular de:
        </p>
        <p className="aviso atencion">{pending.when}</p>
        <p className="tenue">
          Los turnos ya generados no cambian; solo deja de aparecer en los meses que se generen
          después.
        </p>
        {error && <div className="aviso error">{error}</div>}
        <div className="dialogo-acciones">
          <button onClick={onCancel} disabled={busy} autoFocus>
            No, conservar
          </button>
          <button className="danger" onClick={onConfirm} disabled={busy}>
            {busy ? 'Quitando…' : 'Sí, quitar'}
          </button>
        </div>
      </div>
    </div>
  );
}
