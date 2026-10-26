'use client';

import { useEffect, useMemo, useState } from 'react';
import { rangoTurno } from '@/lib/horas';
import { nombreCompleto, nombreFormal } from '@/lib/nombres';
import { clave, coincide, digitos, terminos, type Buscable } from '@/lib/texto';
import type { AvailableParticipant, DashboardShift, ExternalCover } from '@/lib/types';

interface Props {
  locationId: string;
  shift: DashboardShift;
  cargarCandidatos: () => Promise<AvailableParticipant[]>;
  onAgregar: (participantId: string) => Promise<void>;
  /** Registra a quien no está en el padrón de este punto. */
  onAgregarExterno: (datos: ExternalCover) => Promise<void>;
  onCerrar: () => void;
}

/**
 * Registro de quien se ofreció en el grupo.
 *
 * Es el paso que cierra el ciclo: sin él, el tablero seguiría mostrando como
 * descubierto un turno que ya se resolvió por WhatsApp.
 */
const VACIO: ExternalCover = { firstName: '', paternalSurname: '', phone: '', note: '' };

export function AgregarParticipante({
  shift,
  cargarCandidatos,
  onAgregar,
  onAgregarExterno,
  onCerrar,
}: Props) {
  const [candidatos, setCandidatos] = useState<AvailableParticipant[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [elegido, setElegido] = useState<string | null>(null);
  // Alguien de otro punto. Apagado por omisión: lo normal es que quien cubra
  // esté en el padrón, y esto es la excepción que evita cancelar el turno.
  const [deFuera, setDeFuera] = useState(false);
  const [externo, setExterno] = useState<ExternalCover>(VACIO);
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

  // Los candidatos van en dos grupos: el padrón y quienes ya cubrieron aquí sin
  // pertenecer a él. Separarlos evita que un invitado parezca del padrón.
  const delPadron = visibles.filter((persona) => !persona.external);
  const yaCubrieron = visibles.filter((persona) => persona.external);

  const listoExterno =
    externo.firstName.trim() !== '' &&
    externo.paternalSurname.trim() !== '' &&
    externo.phone.trim() !== '';

  async function confirmar() {
    setOcupado(true);
    setError(null);
    try {
      if (deFuera) await onAgregarExterno(externo);
      else if (elegido) await onAgregar(elegido);
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
          {rangoTurno(shift)} ·{' '}
          {shift.freeSlots === 0
            ? 'el turno ya está completo; esta persona entra como lugar extra'
            : shift.freeSlots === 1
              ? 'queda 1 lugar'
              : `quedan ${shift.freeSlots} lugares`}
        </p>

        {error && <div className="aviso error">{error}</div>}

        <label className="casilla">
          <input
            type="checkbox"
            checked={deFuera}
            onChange={(evento) => {
              setDeFuera(evento.target.checked);
              setElegido(null);
              setError(null);
            }}
          />
          <span>
            No está en el padrón de este punto. Viene de otro, y así el turno no se queda
            descubierto.
          </span>
        </label>

        {deFuera ? (
          <fieldset className="grupo">
            <legend>Quien viene de fuera</legend>
            <div className="campos-par">
              <label>
                <span>Nombre</span>
                <input
                  value={externo.firstName}
                  onChange={(e) => setExterno({ ...externo, firstName: e.target.value })}
                  autoFocus
                />
              </label>
              <label>
                <span>Apellido</span>
                <input
                  value={externo.paternalSurname}
                  onChange={(e) => setExterno({ ...externo, paternalSurname: e.target.value })}
                />
              </label>
            </div>
            <label>
              <span>Teléfono</span>
              <input
                value={externo.phone}
                onChange={(e) => setExterno({ ...externo, phone: e.target.value })}
                placeholder="55 1234 5678"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              />
              <span className="tenue" style={{ marginTop: '0.2rem' }}>
                Es lo que evita registrarla dos veces si vuelve a cubrir. No se le envía ningún
                mensaje: no ha dado su consentimiento.
              </span>
            </label>
            <label style={{ marginBottom: 0 }}>
              <span>Nota de esta vez (opcional)</span>
              <input
                value={externo.note}
                onChange={(e) => setExterno({ ...externo, note: e.target.value })}
                placeholder="La trajo Dora"
              />
            </label>
          </fieldset>
        ) : (
          <>
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

              {delPadron.map((persona) => (
                <Candidato
                  key={persona.id}
                  persona={persona}
                  elegido={elegido === persona.id}
                  onElegir={() => setElegido(persona.id)}
                />
              ))}

              {yaCubrieron.length > 0 && (
                <>
                  <p className="grupo-candidatos">Ya han cubierto antes, sin estar en el padrón</p>
                  {yaCubrieron.map((persona) => (
                    <Candidato
                      key={persona.id}
                      persona={persona}
                      elegido={elegido === persona.id}
                      onElegir={() => setElegido(persona.id)}
                    />
                  ))}
                </>
              )}
            </div>
          </>
        )}

        <div className="dialogo-acciones">
          <button onClick={onCerrar} disabled={ocupado}>
            Volver
          </button>
          <button
            className="primario"
            onClick={() => void confirmar()}
            disabled={ocupado || (deFuera ? !listoExterno : !elegido)}
          >
            {ocupado ? 'Agregando…' : 'Agregar al turno'}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Un candidato de la lista, con su teléfono a la vista. */
function Candidato({
  persona,
  elegido,
  onElegir,
}: {
  persona: AvailableParticipant;
  elegido: boolean;
  onElegir: () => void;
}) {
  return (
    <button
      className={`candidato ${elegido ? 'elegido' : ''}`}
      onClick={onElegir}
      aria-pressed={elegido}
    >
      <span className="nombre">{nombreFormal(persona)}</span>
      {/* El teléfono a la vista: al buscar por número hay que poder comprobar
          que el elegido es de quien se creía. */}
      <span className="telefono tenue">{persona.phone}</span>
    </button>
  );
}
