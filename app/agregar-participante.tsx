'use client';

import { useEffect, useState } from 'react';
import { nombreFormal } from '@/lib/nombres';
import type { AvailableParticipant, DashboardShift } from '@/lib/types';

interface Props {
  locationId: string;
  shift: DashboardShift;
  cargarCandidatos: () => Promise<AvailableParticipant[]>;
  onAgregar: (participantId: string) => Promise<void>;
  onCerrar: () => void;
}

/**
 * Registro de quien se ofreció en el grupo.
 *
 * Es el paso que cierra el ciclo: sin él, el tablero seguiría mostrando como
 * descubierto un turno que ya se resolvió por WhatsApp.
 */
export function AgregarParticipante({
  shift,
  cargarCandidatos,
  onAgregar,
  onCerrar,
}: Props) {
  const [candidatos, setCandidatos] = useState<AvailableParticipant[]>([]);
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
          setError(problema instanceof Error ? problema.message : 'No se pudo cargar el padrón');
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
        nombreFormal(persona).toLowerCase().includes(busqueda.trim().toLowerCase()),
      )
    : candidatos;

  async function confirmar() {
    if (!elegido) return;
    setOcupado(true);
    setError(null);
    try {
      await onAgregar(elegido);
    } catch (problema) {
      setError(problema instanceof Error ? problema.message : 'No se pudo agregar');
      setOcupado(false);
    }
  }

  return (
    <div className="telon" role="dialog" aria-modal="true" aria-label="Agregar participante">
      <div className="dialogo">
        <h3>Agregar al turno</h3>
        <p className="tenue">
          {shift.range} ·{' '}
          {shift.freeSlots === 0
            ? 'el turno ya está completo; esta persona entra como lugar extra'
            : shift.freeSlots === 1
              ? 'queda 1 lugar'
              : `quedan ${shift.freeSlots} lugares`}
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
          {cargando && <p className="tenue">Cargando padrón…</p>}
          {!cargando && visibles.length === 0 && (
            <p className="tenue">
              {candidatos.length === 0
                ? 'No hay participantes disponibles para este turno.'
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
              {nombreFormal(persona)}
            </button>
          ))}
        </div>

        <div className="dialogo-acciones">
          <button onClick={onCerrar} disabled={ocupado}>
            Volver
          </button>
          <button
            className="primario"
            onClick={() => void confirmar()}
            disabled={ocupado || !elegido}
          >
            {ocupado ? 'Agregando…' : 'Agregar al turno'}
          </button>
        </div>
      </div>
    </div>
  );
}
