'use client';

import { useState } from 'react';
import { joinMonthLabels, pendingNotSeated, pendingParts } from '@/lib/recurring-sync';
import type { PendingMonth } from '@/lib/types';

interface Props {
  months: PendingMonth[];
  /** Se está aplicando: el botón espera. */
  busy: boolean;
  error: string | null;
  /** Lo que se dijo al terminar la última vez que se aplicó. */
  summary: string | null;
  onApply: () => Promise<boolean>;
}

/**
 * Aviso de que el calendario de los meses próximos no refleja los turnos fijos.
 *
 * Es una leyenda fija y no un aviso tras cada cambio: lo normal es hacer varios
 * cambios seguidos, y lo calcula el servidor, así que sigue ahí al recargar o si
 * el cambio lo hizo otra persona, y desaparece sola cuando ya no hay nada que
 * aplicar.
 */
export function RecurringSyncBanner({ months, busy, error, summary, onApply }: Props) {
  const [confirming, setConfirming] = useState(false);

  if (months.length === 0) {
    return summary ? <div className="aviso exito">{summary}</div> : null;
  }

  const monthsLabel = joinMonthLabels(months);
  const parts = pendingParts(months);
  const notSeated = pendingNotSeated(months);

  async function confirm() {
    if (await onApply()) setConfirming(false);
  }

  return (
    <>
      <div className="aviso atencion aviso-con-accion">
        <div>
          <strong>El rol de {monthsLabel} todavía no refleja los cambios de turnos fijos.</strong>{' '}
          {parts.join(' · ')}. Las cancelaciones y coberturas ya registradas se conservan.
        </div>
        <button className="primario" onClick={() => setConfirming(true)} disabled={busy}>
          {months.length === 1 ? `Aplicar a ${monthsLabel}` : 'Aplicar a los meses próximos'}
        </button>
      </div>

      {confirming && (
        <div className="telon" role="dialog" aria-modal="true" aria-label="Aplicar turnos fijos">
          <div className="dialogo dialogo-ancho">
            <h3>Aplicar los turnos fijos a {monthsLabel}</h3>
            <p className="tenue">
              El calendario de {monthsLabel} ya estaba generado. Esto lo pone al día con los turnos
              fijos de hoy, para que el rol del mes muestre a quien de verdad atenderá.
            </p>

            <h4 style={{ margin: '0 0 0.3rem', fontSize: '0.92rem' }}>Qué va a hacer</h4>
            <ul className="consecuencias">
              {parts.map((part) => (
                <li key={part}>
                  <span className="marca suma">+</span>
                  {part.charAt(0).toUpperCase() + part.slice(1)}.
                </li>
              ))}
            </ul>

            <h4 style={{ margin: '0.8rem 0 0.3rem', fontSize: '0.92rem' }}>Qué no va a tocar</h4>
            <ul className="consecuencias">
              <li>
                <span className="marca igual">=</span>
                Las <strong>cancelaciones</strong> ya registradas: siguen en el Tablero, en el
                historial y en los reportes.
              </li>
              <li>
                <span className="marca igual">=</span>
                Quien entró a <strong>cubrir</strong> o se agregó a mano en una fecha.
              </li>
              <li>
                <span className="marca igual">=</span>
                El <strong>mes en curso</strong>, ni los meses que aún no se generan.
              </li>
              {notSeated > 0 && (
                <li>
                  <span className="marca resta">!</span>
                  {notSeated} titular(es) no cabrán en alguna fecha porque una cobertura ya ocupó el
                  lugar.
                </li>
              )}
            </ul>

            <div className="aviso atencion" style={{ margin: '0.9rem 0' }}>
              <strong>Nadie recibe aviso.</strong> Quien quede asignado o retirado se enterará por
              el rol del mes o por el recordatorio del turno.
            </div>

            {error && <div className="aviso error">{error}</div>}
            <div className="dialogo-acciones">
              <button onClick={() => setConfirming(false)} disabled={busy}>
                Cancelar
              </button>
              <button className="primario" onClick={() => void confirm()} disabled={busy}>
                {busy ? 'Aplicando…' : 'Sí, aplicar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
