'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { nombreCompleto } from '@/lib/nombres';
import { ORGANIZATION_LABELS } from '@/lib/types';
import type { OrganizationField, OrganizationValues, Participant } from '@/lib/types';

interface Props {
  participante: Participant;
  /** Valores ya registrados, para sugerirlos mientras se escribe. */
  valores: OrganizationValues;
  onGuardado: () => Promise<void> | void;
  onCerrar: () => void;
}

const CAMPOS: OrganizationField[] = ['congregation', 'circuit', 'city'];

/**
 * Congregación, circuito y ciudad.
 *
 * Los campos son de texto libre pero sugieren lo ya registrado, y al guardar el
 * servidor alinea una grafía equivalente con la que ya existía: así «Centro» y
 * «centro» no acaban siendo dos filas distintas en un reporte.
 */
export function OrganizacionDialogo({ participante, valores, onGuardado, onCerrar }: Props) {
  const [datos, setDatos] = useState({
    congregation: participante.congregation ?? '',
    circuit: participante.circuit ?? '',
    city: participante.city ?? '',
  });
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function guardar() {
    setOcupado(true);
    setError(null);
    try {
      await api(`/participants/${participante.id}/organization`, {
        method: 'PATCH',
        body: {
          congregation: datos.congregation.trim() || null,
          circuit: datos.circuit.trim() || null,
          city: datos.city.trim() || null,
        },
      });
      await onGuardado();
      onCerrar();
    } catch (problema) {
      setError(problema instanceof Error ? problema.message : 'No se pudo guardar');
      setOcupado(false);
    }
  }

  return (
    <div className="telon" role="dialog" aria-modal="true" aria-label="Datos de organización">
      <div className="dialogo">
        <h3>Congregación y ubicación</h3>
        <p className="tenue">{nombreCompleto(participante)}</p>

        {error && <div className="aviso error">{error}</div>}

        {CAMPOS.map((campo) => (
          <label key={campo}>
            <span>{ORGANIZATION_LABELS[campo]}</span>
            <input
              value={datos[campo]}
              onChange={(evento) => setDatos({ ...datos, [campo]: evento.target.value })}
              list={`sugerencias-${campo}`}
              placeholder="Opcional"
            />
            <datalist id={`sugerencias-${campo}`}>
              {valores[campo]?.map((valor) => (
                <option key={valor} value={valor} />
              ))}
            </datalist>
          </label>
        ))}

        <p className="tenue">
          Si escribes algo equivalente a un valor ya registrado, se guardará con la escritura que ya
          existía, para que los reportes no se dividan.
        </p>

        <div className="dialogo-acciones">
          <button onClick={onCerrar} disabled={ocupado}>
            Volver
          </button>
          <button className="primario" onClick={() => void guardar()} disabled={ocupado}>
            {ocupado ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
