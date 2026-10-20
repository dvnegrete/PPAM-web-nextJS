'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  CATEGORIAS_BITACORA,
  type AuditHistoryEntry,
  type AuditHistoryPage,
  type CategoriaBitacora,
} from '@/lib/types';

const POR_PAGINA = 50;

/** «19 oct 2026, 14:05» */
function cuando(iso: string): string {
  return new Date(iso).toLocaleString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface Filtros {
  desde: string;
  hasta: string;
  categoria: CategoriaBitacora | '';
  persona: string;
}

const SIN_FILTROS: Filtros = { desde: '', hasta: '', categoria: '', persona: '' };

function construirRuta(filtros: Filtros, cursor: string | null): string {
  const params = new URLSearchParams({ limit: String(POR_PAGINA) });
  if (filtros.desde) params.set('from', new Date(`${filtros.desde}T00:00:00`).toISOString());
  if (filtros.hasta) params.set('to', new Date(`${filtros.hasta}T23:59:59`).toISOString());
  if (filtros.categoria) params.set('categoria', filtros.categoria);
  if (filtros.persona.trim()) params.set('persona', filtros.persona.trim());
  if (cursor) params.set('cursor', cursor);
  return `/audit?${params.toString()}`;
}

/**
 * El histórico completo de actividad, de lo más reciente hacia atrás.
 *
 * Avanza por cursor, no por número de página: la bitácora sigue creciendo
 * mientras se consulta, y así cada carga continúa donde quedó la anterior en
 * lugar de desplazarse.
 */
export function Bitacora({ esAdmin }: { esAdmin: boolean }) {
  const [filtros, setFiltros] = useState<Filtros>(SIN_FILTROS);
  // Lo que se teclea va aparte de lo que se consulta: sin esto, buscar «López»
  // lanzaría cinco peticiones, una por letra.
  const [personaTecleada, setPersonaTecleada] = useState('');
  const [entradas, setEntradas] = useState<AuditHistoryEntry[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categorias = CATEGORIAS_BITACORA.filter(
    (item) => esAdmin || !('soloAdmin' in item && item.soloAdmin),
  );

  useEffect(() => {
    if (personaTecleada === filtros.persona) return;
    const espera = window.setTimeout(
      () => setFiltros((previos) => ({ ...previos, persona: personaTecleada })),
      400,
    );
    return () => window.clearTimeout(espera);
  }, [personaTecleada, filtros.persona]);

  // La primera página de los filtros actuales. La bandera `vigente` descarta la
  // respuesta de un filtro que ya se cambió: dos cargas pueden volver en
  // cualquier orden y se vería la lista de la consulta anterior.
  useEffect(() => {
    let vigente = true;
    setCargando(true);
    setError(null);
    api<AuditHistoryPage>(construirRuta(filtros, null))
      .then((pagina) => {
        if (!vigente) return;
        setEntradas(pagina.entries);
        setCursor(pagina.nextCursor);
      })
      .catch((problema: unknown) => {
        if (!vigente) return;
        setError(problema instanceof Error ? problema.message : 'No se pudo cargar la bitácora');
        setEntradas([]);
        setCursor(null);
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [filtros]);

  async function cargarMas() {
    if (!cursor) return;
    setCargando(true);
    setError(null);
    try {
      const pagina = await api<AuditHistoryPage>(construirRuta(filtros, cursor));
      setEntradas((previas) => [...previas, ...pagina.entries]);
      setCursor(pagina.nextCursor);
    } catch (problema) {
      setError(problema instanceof Error ? problema.message : 'No se pudo cargar más');
    } finally {
      setCargando(false);
    }
  }

  const hayFiltros = Boolean(
    filtros.desde || filtros.hasta || filtros.categoria || filtros.persona,
  );

  return (
    <section>
      <div className="tarjeta" style={{ marginBottom: '1rem' }}>
        <h3>Histórico de actividad</h3>
        <p className="tenue">
          Todo lo que queda registrado, de lo más reciente hacia atrás. Es el registro de todo el
          sistema, no de un punto en particular.
        </p>

        <div className="filtros-bitacora">
          <label>
            <span>Desde</span>
            <input
              type="date"
              value={filtros.desde}
              onChange={(e) => setFiltros({ ...filtros, desde: e.target.value })}
            />
          </label>
          <label>
            <span>Hasta</span>
            <input
              type="date"
              value={filtros.hasta}
              onChange={(e) => setFiltros({ ...filtros, hasta: e.target.value })}
            />
          </label>
          <label>
            <span>Actividad</span>
            <select
              value={filtros.categoria}
              onChange={(e) =>
                setFiltros({ ...filtros, categoria: e.target.value as CategoriaBitacora | '' })
              }
            >
              <option value="">Toda</option>
              {categorias.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.etiqueta}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Persona</span>
            <input
              type="search"
              placeholder="Nombre o apellido"
              value={personaTecleada}
              onChange={(e) => setPersonaTecleada(e.target.value)}
            />
          </label>
        </div>

        {hayFiltros && (
          <div className="atajos">
            <button
              onClick={() => {
                setPersonaTecleada('');
                setFiltros(SIN_FILTROS);
              }}
            >
              Quitar filtros
            </button>
          </div>
        )}
      </div>

      {error && <div className="aviso error">{error}</div>}

      {entradas.length === 0 && !cargando && !error && (
        <div className="aviso atencion">
          {hayFiltros
            ? 'No hay actividad que cumpla estos filtros.'
            : 'Todavía no hay actividad registrada.'}
        </div>
      )}

      {entradas.length > 0 && (
        <div className="tarjeta">
          <ol className="bitacora">
            {entradas.map((entrada) => (
              <li key={entrada.id}>
                <span className="tenue momento">{cuando(entrada.at)}</span>
                <span className="accion">{entrada.label}</span>
                <span className="detalle">
                  {/* Para las acciones sin frase propia, `description` repite la
                      etiqueta: mostrarlo dos veces no aportaría nada. */}
                  {entrada.description !== entrada.label && <>{entrada.description} · </>}
                  {entrada.by}
                  {entrada.reason && ` · «${entrada.reason}»`}
                </span>
              </li>
            ))}
          </ol>

          <div className="turno-pie">
            {cursor ? (
              <button onClick={() => void cargarMas()} disabled={cargando}>
                {cargando ? 'Cargando…' : 'Cargar más'}
              </button>
            ) : (
              <span className="tenue">
                {entradas.length === 1
                  ? 'Una entrada en total.'
                  : `${entradas.length} entradas; no hay nada más atrás.`}
              </span>
            )}
          </div>
        </div>
      )}

      {cargando && entradas.length === 0 && <p className="tenue">Cargando…</p>}
    </section>
  );
}
