'use client';

import { useState } from 'react';
import type { ConfirmationRow } from '@/lib/types';

/**
 * El paso que separa copiar de dar por notificado a alguien.
 *
 * Copiar no puede marcar: entre que el encargado copia el mensaje y lo pega en
 * el grupo puede pasar cualquier cosa —se distrae, cambia de app, decide
 * publicarlo más tarde—, y si se hubiera marcado al copiar, esas personas
 * desaparecerían de la lista sin que nadie les haya confirmado nada.
 *
 * Por eso aquí se pregunta, con todo marcado de entrada: lo habitual es que se
 * publique el mensaje completo, y desmarcar es la excepción.
 */
export function ConfirmarPublicado({
  filas,
  onConfirmar,
  onCerrar,
}: {
  filas: ConfirmationRow[];
  onConfirmar: (keys: string[]) => Promise<void>;
  onCerrar: () => void;
}) {
  const [marcadas, setMarcadas] = useState<Set<string>>(
    () => new Set(filas.map((fila) => fila.key)),
  );
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  function alternar(key: string) {
    setMarcadas((previas) => {
      const siguiente = new Set(previas);
      if (siguiente.has(key)) siguiente.delete(key);
      else siguiente.add(key);
      return siguiente;
    });
  }

  async function confirmar() {
    setOcupado(true);
    setError(null);
    try {
      await onConfirmar([...marcadas]);
    } catch (problema) {
      setError(problema instanceof Error ? problema.message : 'No se pudo guardar');
      setOcupado(false);
    }
  }

  const todas = marcadas.size === filas.length;

  return (
    <div className="telon" role="dialog" aria-modal="true" aria-label="Confirmar publicación">
      <div className="dialogo">
        <h3>¿Ya lo publicaste en el grupo?</h3>
        <p className="tenue">
          Esto no envía nada: solo deja anotado a quién ya se le confirmó, para que no vuelva a
          salir en el próximo mensaje. Si todavía no lo pegaste, vuelve con «Todavía no» y los
          turnos seguirán aquí.
        </p>

        {error && <div className="aviso error">{error}</div>}

        <ul className="personas" style={{ marginBottom: '0.9rem' }}>
          {filas.map((fila) => (
            <li key={fila.key}>
              <label className="casilla" style={{ margin: 0 }}>
                <input
                  type="checkbox"
                  checked={marcadas.has(fila.key)}
                  onChange={() => alternar(fila.key)}
                />
                <span>
                  <strong>{fila.name}</strong>
                  <span className="tenue" style={{ display: 'block' }}>
                    {fila.dayLabel} de {fila.range}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>

        <p className="tenue">
          {todas
            ? filas.length === 1
              ? 'Se marcará como publicada la única confirmación del mensaje.'
              : `Se marcarán como publicadas las ${filas.length} confirmaciones del mensaje.`
            : `Quedan ${marcadas.size} de ${filas.length} marcadas; las demás volverán a aparecer en el próximo mensaje.`}
        </p>

        <div className="dialogo-acciones">
          <button onClick={onCerrar} disabled={ocupado}>
            Todavía no
          </button>
          <button
            className="primario"
            onClick={() => void confirmar()}
            disabled={ocupado || marcadas.size === 0}
          >
            {ocupado ? 'Guardando…' : 'Sí, ya lo publiqué'}
          </button>
        </div>
      </div>
    </div>
  );
}
