'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { MaritalStatus, Participant, SpouseCandidate } from '@/lib/types';
import { MARITAL_LABELS } from '@/lib/types';
import { nombreCompleto, nombreFormal } from '@/lib/nombres';

/** Cómo se registra al cónyuge: con referencia al padrón o solo su nombre. */
type Modo = 'participante' | 'externo';

interface Props {
  locationId: string;
  participante: Participant;
  onGuardado: () => Promise<void> | void;
  onCerrar: () => void;
}

/**
 * Estado civil y cónyuge de una persona.
 *
 * La distinción que importa: si el cónyuge también atiende los exhibidores se
 * guarda la referencia al padrón —queda disponible para armar turnos más
 * adelante— y si no, solo se anota su nombre, sin pedir ningún otro dato.
 */
export function EstadoCivilDialogo({ locationId, participante, onGuardado, onCerrar }: Props) {
  const [estado, setEstado] = useState<MaritalStatus>(participante.maritalStatus);
  const [modo, setModo] = useState<Modo>(participante.spouseName ? 'externo' : 'participante');
  const [conyugeId, setConyugeId] = useState<string>(participante.spouse?.id ?? '');
  const [conyugeNombre, setConyugeNombre] = useState(participante.spouseName ?? '');
  const [candidatos, setCandidatos] = useState<SpouseCandidate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const casado = estado === 'CASADO';

  useEffect(() => {
    if (!casado) return;
    let vigente = true;
    api<SpouseCandidate[]>(
      `/locations/${locationId}/participants/${participante.id}/spouse-candidates`,
    )
      .then((lista) => {
        if (vigente) setCandidatos(lista);
      })
      .catch((problema: unknown) => {
        if (vigente) {
          setError(problema instanceof Error ? problema.message : 'No se pudo cargar el padrón');
        }
      });
    return () => {
      vigente = false;
    };
  }, [casado, locationId, participante.id]);

  async function guardar() {
    setOcupado(true);
    setError(null);
    try {
      await api(`/participants/${participante.id}/marital`, {
        method: 'PATCH',
        body: {
          maritalStatus: estado,
          spouseParticipantId: casado && modo === 'participante' ? conyugeId || null : null,
          spouseName: casado && modo === 'externo' ? conyugeNombre.trim() || null : null,
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
    <div className="telon" role="dialog" aria-modal="true" aria-label="Estado civil">
      <div className="dialogo">
        <h3>Estado civil</h3>
        <p className="tenue">{nombreCompleto(participante)}</p>

        {error && <div className="aviso error">{error}</div>}

        <label>
          <span>Estado</span>
          <select
            value={estado}
            onChange={(evento) => setEstado(evento.target.value as MaritalStatus)}
          >
            {(Object.keys(MARITAL_LABELS) as MaritalStatus[]).map((clave) => (
              <option key={clave} value={clave}>
                {MARITAL_LABELS[clave]}
              </option>
            ))}
          </select>
        </label>

        {casado && (
          <>
            <fieldset className="opciones-conyuge">
              <legend>¿Su cónyuge atiende los exhibidores?</legend>
              <label className="opcion">
                <input
                  type="radio"
                  name="modo-conyuge"
                  checked={modo === 'participante'}
                  onChange={() => setModo('participante')}
                />
                <span>Sí, está en el padrón</span>
              </label>
              <label className="opcion">
                <input
                  type="radio"
                  name="modo-conyuge"
                  checked={modo === 'externo'}
                  onChange={() => setModo('externo')}
                />
                <span>No participa</span>
              </label>
            </fieldset>

            {modo === 'participante' ? (
              <label>
                <span>Cónyuge</span>
                <select value={conyugeId} onChange={(evento) => setConyugeId(evento.target.value)}>
                  <option value="">Sin especificar</option>
                  {candidatos.map((candidato) => (
                    <option key={candidato.id} value={candidato.id}>
                      {nombreFormal(candidato)}
                    </option>
                  ))}
                </select>
                <span className="tenue" style={{ marginTop: '0.2rem' }}>
                  Solo aparecen quienes no tienen pareja registrada. La relación queda guardada en
                  ambos.
                </span>
              </label>
            ) : (
              <label>
                <span>Nombre del cónyuge</span>
                <input
                  value={conyugeNombre}
                  onChange={(evento) => setConyugeNombre(evento.target.value)}
                  placeholder="Nombre y apellido"
                />
                <span className="tenue" style={{ marginTop: '0.2rem' }}>
                  Solo el nombre, como referencia. No se guarda ningún otro dato ni se le envía
                  nada.
                </span>
              </label>
            )}
          </>
        )}

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
