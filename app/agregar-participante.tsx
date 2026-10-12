'use client';

import { useEffect, useMemo, useState } from 'react';
import { nombreCompleto, nombreFormal } from '@/lib/nombres';
import { clave, coincide, digitos, terminos, type Buscable } from '@/lib/texto';
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

  /**
   * Lo buscable de cada candidato: su nombre y su teléfono.
   *
   * Quien se ofrece para cubrir lo hace desde su número por WhatsApp, así que
   * ese es el dato que el administrador tiene delante; buscar solo por nombre lo
   * obligaba a adivinar cómo está escrito en el padrón.
   *
   * Se usa `nombreCompleto` y no `nombreFormal`: el formal devuelve «López
   * Pérez, Ana María», y con la coma en medio escribir «Ana López» no
   * encontraba a Ana López.
   */
  const indice = useMemo(() => {
    const mapa = new Map<string, Buscable>();
    for (const persona of candidatos) {
      mapa.set(persona.id, {
        texto: clave(`${nombreCompleto(persona)} ${persona.displayName ?? ''}`),
        digitos: digitos(persona.phone),
      });
    }
    return mapa;
  }, [candidatos]);

  const terms = useMemo(() => terminos(busqueda), [busqueda]);
  const visibles =
    terms.length === 0
      ? candidatos
      : candidatos.filter((persona) => coincide(terms, indice.get(persona.id)!));

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
            type="search"
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
            placeholder="Nombre o teléfono"
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
              <span className="nombre">{nombreFormal(persona)}</span>
              {/* El teléfono a la vista: al buscar por número hay que poder
                  comprobar que el elegido es de quien se creía. */}
              <span className="telefono tenue">{persona.phone}</span>
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
