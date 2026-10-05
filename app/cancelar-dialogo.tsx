'use client';

import { useState } from 'react';

interface Props {
  nombre: string;
  turno: string;
  motivos: Array<{ code: string; label: string }>;
  onCancelar: (reasonCode: string, reason: string) => Promise<void>;
  onCerrar: () => void;
}

/**
 * Confirmación de una baja.
 *
 * Pide el motivo porque después sirve para entender los reportes, pero no obliga
 * a escribir nada: en el momento en que se captura, lo urgente es que el turno
 * quede liberado cuanto antes.
 */
export function CancelarDialogo({ nombre, turno, motivos, onCancelar, onCerrar }: Props) {
  const [codigo, setCodigo] = useState(motivos[0]?.code ?? 'otro');
  const [detalle, setDetalle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function confirmar() {
    setOcupado(true);
    setError(null);
    try {
      await onCancelar(codigo, detalle.trim());
    } catch (problema) {
      setError(problema instanceof Error ? problema.message : 'No se pudo cancelar');
      setOcupado(false);
    }
  }

  return (
    <div className="telon" role="dialog" aria-modal="true" aria-label="Cancelar turno">
      <div className="dialogo">
        <h3>Cancelar turno</h3>
        <p className="tenue">
          {nombre} · {turno}
        </p>

        {error && <div className="aviso error">{error}</div>}

        <label>
          <span>Motivo</span>
          <select value={codigo} onChange={(evento) => setCodigo(evento.target.value)}>
            {motivos.map((motivo) => (
              <option key={motivo.code} value={motivo.code}>
                {motivo.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Detalle (opcional)</span>
          <input
            value={detalle}
            onChange={(evento) => setDetalle(evento.target.value)}
            placeholder="Avisó por mensaje"
          />
        </label>

        <p className="tenue">
          El lugar queda libre de inmediato y aparecerá en la encuesta del grupo.
        </p>

        <div className="dialogo-acciones">
          <button onClick={onCerrar} disabled={ocupado}>
            Volver
          </button>
          <button className="primario" onClick={() => void confirmar()} disabled={ocupado}>
            {ocupado ? 'Cancelando…' : 'Confirmar cancelación'}
          </button>
        </div>
      </div>
    </div>
  );
}
