'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import type {
  RecurringCandidate,
  RecurringOverview,
  RecurringSlot,
} from '@/lib/types';

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const ORDINALES = ['', '1.ª', '2.ª', '3.ª', '4.ª', '5.ª'];

/**
 * Turnos fijos: quién atiende habitualmente cada franja.
 *
 * Es la captura que hace que un mes nuevo nazca casi completo. El generador de
 * calendario sienta a estos titulares en cada ocurrencia de su franja, así que
 * lo que falte aquí sale después como un hueco que hay que cubrir a mano.
 *
 * La rejilla se arma con las franjas que existen, no con un horario fijo en el
 * código: si mañana el punto abre a otra hora o se agrega un día, la pantalla lo
 * refleja sin tocarla.
 */
export function TurnosFijos({ locationId }: { locationId: string }) {
  const [datos, setDatos] = useState<RecurringOverview | null>(null);
  const [semana, setSemana] = useState(0);
  const [eligiendo, setEligiendo] = useState<RecurringSlot | null>(null);
  const [quitando, setQuitando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    try {
      setDatos(await api<RecurringOverview>(`/locations/${locationId}/recurring`));
      setError(null);
    } catch (problema) {
      setError(problema instanceof Error ? problema.message : 'No se pudieron cargar los turnos fijos');
    } finally {
      setCargando(false);
    }
  }, [locationId]);

  useEffect(() => {
    setCargando(true);
    void cargar();
  }, [cargar]);

  /**
   * Las franjas que se repiten todas las semanas van juntas; las que dependen
   * del ordinal del mes —típicamente sábados y domingos— se separan, porque una
   * sola rejilla con las cinco semanas sería ilegible.
   */
  const bloques = useMemo(() => {
    const slots = datos?.slots ?? [];
    const semanales = slots.filter((slot) => slot.weekOfMonth === 0);
    const ordinales = slots.filter((slot) => slot.weekOfMonth > 0);
    const semanasDisponibles = [...new Set(ordinales.map((slot) => slot.weekOfMonth))].sort(
      (a, b) => a - b,
    );
    return { semanales, ordinales, semanasDisponibles };
  }, [datos]);

  // La primera pestaña de semana se elige sola: así la sección no arranca vacía.
  useEffect(() => {
    if (semana === 0 && bloques.semanasDisponibles.length > 0) {
      setSemana(bloques.semanasDisponibles[0]);
    }
  }, [bloques.semanasDisponibles, semana]);

  async function agregar(templateId: string, participantId: string) {
    await api(`/locations/${locationId}/recurring/${templateId}/holders`, {
      method: 'POST',
      body: { participantId },
    });
    setEligiendo(null);
    await cargar();
  }

  async function quitar(recurringId: string) {
    setQuitando(recurringId);
    setError(null);
    try {
      await api(`/recurring/${recurringId}`, { method: 'DELETE' });
      await cargar();
    } catch (problema) {
      setError(problema instanceof Error ? problema.message : 'No se pudo quitar');
    } finally {
      setQuitando(null);
    }
  }

  const cargarCandidatos = useCallback(
    (templateId: string) => () =>
      api<RecurringCandidate[]>(`/locations/${locationId}/recurring/${templateId}/candidates`),
    [locationId],
  );

  if (cargando) return <p className="tenue">Cargando turnos fijos…</p>;

  const sinTurno = (datos?.padron ?? []).filter((persona) => persona.recurringCount === 0);
  const totalTitulares = (datos?.slots ?? []).reduce((suma, slot) => suma + slot.holders.length, 0);
  const totalLugares = (datos?.slots ?? []).reduce((suma, slot) => suma + slot.capacity, 0);

  return (
    <section>
      {error && <div className="aviso error">{error}</div>}

      <div className="resumen" style={{ marginBottom: '1rem' }}>
        <div className="metrica">
          <span className="cifra">{totalTitulares}</span>
          <span className="rotulo">de {totalLugares} lugares con titular</span>
        </div>
        <div className={`metrica ${sinTurno.length > 0 ? 'atencion' : ''}`}>
          <span className="cifra">{sinTurno.length}</span>
          <span className="rotulo">sin ningún turno fijo</span>
        </div>
        <div className="metrica">
          <span className="cifra">{datos?.padron.length ?? 0}</span>
          <span className="rotulo">en el padrón del punto</span>
        </div>
      </div>

      <p className="tenue" style={{ marginBottom: '1rem' }}>
        Al generar el calendario de un mes, cada titular queda sentado en todas las ocurrencias de su
        franja. Quitar a alguien de aquí no toca los turnos ya generados: solo cambia lo que se
        materialice de ahora en adelante.
      </p>

      {bloques.semanales.length > 0 && (
        <div className="tarjeta" style={{ marginBottom: '1rem' }}>
          <h3>Todas las semanas</h3>
          <p className="tenue">Estas franjas se repiten cada semana del mes.</p>
          <Rejilla
            slots={bloques.semanales}
            onAgregar={setEligiendo}
            onQuitar={(id) => void quitar(id)}
            quitando={quitando}
          />
        </div>
      )}

      {bloques.semanasDisponibles.length > 0 && (
        <div className="tarjeta" style={{ marginBottom: '1rem' }}>
          <h3>Por semana del mes</h3>
          <p className="tenue">
            Estas franjas cambian según el ordinal de la semana: el primer sábado puede tener otros
            titulares que el segundo.
          </p>
          <div className="segmentado" style={{ margin: '0.6rem 0 0.9rem' }}>
            {bloques.semanasDisponibles.map((numero) => (
              <button
                key={numero}
                className={semana === numero ? 'primario' : ''}
                onClick={() => setSemana(numero)}
              >
                {ORDINALES[numero] ?? `${numero}.ª`} semana
              </button>
            ))}
          </div>
          <Rejilla
            slots={bloques.ordinales.filter((slot) => slot.weekOfMonth === semana)}
            onAgregar={setEligiendo}
            onQuitar={(id) => void quitar(id)}
            quitando={quitando}
          />
        </div>
      )}

      {(datos?.slots.length ?? 0) === 0 && (
        <div className="aviso atencion">
          Este punto no tiene franjas horarias configuradas todavía. Defínelas en «Ajustes» antes de
          asignar turnos fijos.
        </div>
      )}

      <details className="tarjeta">
        <summary style={{ cursor: 'pointer' }}>
          Padrón del punto ({datos?.padron.length ?? 0}) · {sinTurno.length} sin turno fijo
        </summary>
        <table style={{ marginTop: '0.8rem' }}>
          <thead>
            <tr>
              <th>Participante</th>
              <th className="numero" style={{ width: 120 }}>Turnos fijos</th>
            </tr>
          </thead>
          <tbody>
            {(datos?.padron ?? []).map((persona) => (
              <tr key={persona.id}>
                <td>{persona.formalName}</td>
                <td className="numero">
                  {persona.recurringCount === 0 ? (
                    <span className="etiqueta faltante">Sin asignar</span>
                  ) : (
                    persona.recurringCount
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(datos?.padron.length ?? 0) === 0 && (
          <p className="tenue">Aún no hay nadie en el padrón de este punto. Usa la pestaña «Importar».</p>
        )}
      </details>

      {eligiendo && (
        <ElegirTitular
          slot={eligiendo}
          cargarCandidatos={cargarCandidatos(eligiendo.templateId)}
          onAgregar={(participantId) => agregar(eligiendo.templateId, participantId)}
          onCerrar={() => setEligiendo(null)}
        />
      )}
    </section>
  );
}

/** La rejilla de franjas: filas por horario, columnas por día. */
function Rejilla({
  slots,
  onAgregar,
  onQuitar,
  quitando,
}: {
  slots: RecurringSlot[];
  onAgregar: (slot: RecurringSlot) => void;
  onQuitar: (recurringId: string) => void;
  quitando: string | null;
}) {
  // Los días se ordenan empezando en lunes: es cómo se lee un horario, aunque en
  // la base el domingo sea el día 0.
  const dias = [...new Set(slots.map((slot) => slot.weekday))].sort(
    (a, b) => ((a + 6) % 7) - ((b + 6) % 7),
  );
  const franjas = [...new Map(slots.map((slot) => [slot.startMinute, slot.range])).entries()].sort(
    (a, b) => a[0] - b[0],
  );

  if (slots.length === 0) {
    return <p className="tenue">No hay franjas configuradas para esta semana.</p>;
  }

  return (
    <div className="rejilla-fijos-envoltura">
      <table className="rejilla-fijos">
        <thead>
          <tr>
            <th style={{ width: '7.5rem' }}>Horario</th>
            {dias.map((dia) => (
              <th key={dia}>
                <abbr title={DIAS[dia]}>{DIAS_CORTOS[dia]}</abbr>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {franjas.map(([startMinute, range]) => (
            <tr key={startMinute}>
              <th scope="row" className="franja">{range}</th>
              {dias.map((dia) => {
                const slot = slots.find(
                  (item) => item.weekday === dia && item.startMinute === startMinute,
                );
                if (!slot) {
                  return (
                    <td key={dia} className="celda-fija sin-franja">
                      <span className="tenue">—</span>
                    </td>
                  );
                }
                return (
                  <td key={dia} className="celda-fija">
                    <div className="cupo">
                      <span
                        className={`etiqueta ${
                          slot.freeSlots === 0
                            ? 'completo'
                            : slot.holders.length === 0
                              ? 'critico'
                              : 'faltante'
                        }`}
                      >
                        {slot.holders.length}/{slot.capacity}
                      </span>
                    </div>
                    <ul className="titulares">
                      {slot.holders.map((titular) => (
                        <li key={titular.recurringId}>
                          <span className="nombre">{titular.name}</span>
                          <button
                            className="quitar"
                            onClick={() => onQuitar(titular.recurringId)}
                            disabled={quitando === titular.recurringId}
                            aria-label={`Quitar a ${titular.name} de ${DIAS[dia]} ${range}`}
                            title={`Quitar a ${titular.name}`}
                          >
                            ×
                          </button>
                        </li>
                      ))}
                    </ul>
                    {slot.freeSlots > 0 && (
                      <button
                        className="agregar-titular"
                        onClick={() => onAgregar(slot)}
                        aria-label={`Agregar titular a ${DIAS[dia]} ${range}`}
                      >
                        + Agregar
                      </button>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Quién toma la franja. Solo lista a quien puede: activo, del punto y no titular. */
function ElegirTitular({
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
      setError(problema instanceof Error ? problema.message : 'No se pudo asignar');
      setOcupado(false);
    }
  }

  const cuando =
    slot.weekOfMonth === 0
      ? `${DIAS[slot.weekday]} · ${slot.range} · todas las semanas`
      : `${DIAS[slot.weekday]} · ${slot.range} · ${ORDINALES[slot.weekOfMonth]} semana del mes`;

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
          {cargando && <p className="tenue">Cargando padrón…</p>}
          {!cargando && visibles.length === 0 && (
            <p className="tenue">
              {candidatos.length === 0
                ? 'Todos los del padrón ya son titulares de esta franja.'
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
