'use client';

import { useEffect, useState } from 'react';
import { errorMessage } from '@/lib/errors';
import { describeSlot } from '@/lib/recurring-slots';
import type { RecurringCandidate, RecurringSlot } from '@/lib/types';

/** Quién toma la franja. Solo lista a quien puede: activo, del punto y no titular. */
export function ElegirTitular({
  slot,
  cargarCandidatos,
  onAgregar,
  onCerrar,
}: {
  slot: RecurringSlot;
  cargarCandidatos: () => Promise<RecurringCandidate[]>;
  onAgregar: (participantId: string) => Promise<void>;
  onCerrar: () => void;
}) {
  const [candidatos, setCandidatos] = useState<RecurringCandidate[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [elegido, setElegido] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let vigente = true;
    cargarCandidatos()
      .then((lista) => {
        if (vigente) setCandidatos(lista);
      })
      .catch((problema: unknown) => {
        if (vigente) {
          setError(errorMessage(problema, 'No se pudieron cargar los participantes'));
        }
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [cargarCandidatos]);

  const visibles = busqueda.trim()
    ? candidatos.filter((persona) =>
        persona.formalName.toLowerCase().includes(busqueda.trim().toLowerCase()),
      )
    : candidatos;

  async function confirmar() {
    if (!elegido) return;
    setOcupado(true);
    setError(null);
    try {
      await onAgregar(elegido);
    } catch (problema) {
      setError(errorMessage(problema, 'No se pudo asignar'));
      setOcupado(false);
    }
  }

  const cuando = describeSlot(slot);

  return (
    <div className="telon" role="dialog" aria-modal="true" aria-label="Asignar turno fijo">
      <div className="dialogo">
        <h3>Titular habitual</h3>
        <p className="tenue">
          {cuando} · {slot.freeSlots === 1 ? 'queda 1 lugar' : `quedan ${slot.freeSlots} lugares`}
        </p>

        {error && <div className="aviso error">{error}</div>}

        <label>
          <span>Buscar</span>
          <input
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
            placeholder="Nombre del participante"
            autoFocus
          />
        </label>

        <div className="lista-candidatos">
          {cargando && <p className="tenue">Cargando participantes…</p>}
          {!cargando && visibles.length === 0 && (
            <p className="tenue">
              {candidatos.length === 0
                ? 'Todos los participantes ya son titulares de esta franja.'
                : 'Nadie coincide con esa búsqueda.'}
            </p>
          )}
          {visibles.map((persona) => (
            <button
              key={persona.id}
              className={`candidato ${elegido === persona.id ? 'elegido' : ''}`}
              onClick={() => setElegido(persona.id)}
              aria-pressed={elegido === persona.id}
            >
              {persona.formalName}
            </button>
          ))}
        </div>

        <div className="dialogo-acciones">
          <button onClick={onCerrar} disabled={ocupado}>
            Volver
          </button>
          <button className="primario" onClick={() => void confirmar()} disabled={ocupado || !elegido}>
            {ocupado ? 'Asignando…' : 'Asignar turno fijo'}
          </button>
        </div>
      </div>
    </div>
  );
}
