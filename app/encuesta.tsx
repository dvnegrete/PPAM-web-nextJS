'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchPollDraft } from '@/lib/services/group-messages';
import type { PollDraft } from '@/lib/types';
import { BotonCopiar } from './boton-copiar';
import { MONTH_ABBREVIATIONS } from '@/lib/calendar-labels';
import { errorMessage } from '@/lib/errors';

type Nivel = 'cupo' | 'minimo';

/** AAAA-MM-DD de hoy más los días indicados, en hora local. */
function enDias(dias: number): string {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + dias);
  return fecha.toISOString().slice(0, 10);
}

/** «16 nov», a partir de AAAA-MM-DD, sin pasar por zonas horarias. */
function diaCorto(fecha: string): string {
  const [, mes, dia] = fecha.split('-');
  return `${Number(dia)} ${MONTH_ABBREVIATIONS[Number(mes) - 1] ?? ''}`;
}

export function Encuesta({ locationId }: { locationId: string }) {
  const [desde, setDesde] = useState(enDias(0));
  const [hasta, setHasta] = useState(enDias(7));
  const [nivel, setNivel] = useState<Nivel>('cupo');
  const [borrador, setBorrador] = useState<PollDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const from = new Date(`${desde}T00:00:00`).toISOString();
      const to = new Date(`${hasta}T23:59:59`).toISOString();
      setBorrador(await fetchPollDraft(locationId, from, to, nivel));
    } catch (problema) {
      setError(errorMessage(problema, 'No se pudo generar el texto'));
    } finally {
      setCargando(false);
    }
  }, [locationId, desde, hasta, nivel]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return (
    <section>
      <p className="tenue encuesta-intro">Copia cada parte y pégala en WhatsApp.</p>

      {/* Plegado: casi siempre sirve el periodo por omisión, y abierto empujaba
          la pregunta y las opciones fuera de la primera pantalla del teléfono. */}
      <details className="tarjeta plegable">
        <summary>
          Periodo
          <span className="etiqueta">
            {diaCorto(desde)} – {diaCorto(hasta)}
          </span>
          <span className="etiqueta">
            {nivel === 'cupo' ? 'Turnos incompletos' : 'Solo los críticos'}
          </span>
        </summary>

        <div className="filtros-encuesta">
          <label>
            <span>Desde</span>
            <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
          </label>
          <label>
            <span>Hasta</span>
            <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </label>
          <label>
            <span>Incluir</span>
            <select value={nivel} onChange={(e) => setNivel(e.target.value as Nivel)}>
              <option value="cupo">Turnos incompletos</option>
              <option value="minimo">Solo los críticos</option>
            </select>
          </label>
        </div>

        <div className="atajos">
          <button
            onClick={() => {
              setDesde(enDias(0));
              setHasta(enDias(7));
            }}
          >
            Próxima semana
          </button>
          <button
            onClick={() => {
              setDesde(enDias(0));
              setHasta(enDias(14));
            }}
          >
            Próximos 14 días
          </button>
        </div>
      </details>

      {error && <div className="aviso error">{error}</div>}
      {cargando && <p className="tenue">Generando…</p>}

      {borrador && !cargando && (
        <>
          {borrador.truncated && (
            <div className="aviso atencion">
              Hay {borrador.totalNeeded} turnos por cubrir, pero una encuesta de WhatsApp admite
              como máximo {borrador.maxOptions} opciones. Se muestran los {borrador.maxOptions} más
              próximos; acorta el rango de fechas para incluir el resto en otra encuesta.
            </div>
          )}

          {borrador.options.length === 0 ? (
            <div className="aviso exito">
              No hay turnos por cubrir en este periodo. No hace falta publicar nada.
            </div>
          ) : (
            <>
              <div className="tarjeta seccion-color verde" style={{ marginBottom: '1rem' }}>
                <h3>1. Pregunta de la encuesta</h3>
                <div className="copiable">
                  <code>{borrador.question}</code>
                  <BotonCopiar texto={borrador.question} />
                </div>
              </div>

              <div className="tarjeta seccion-color azul" style={{ marginBottom: '1rem' }}>
                <h3>2. Opciones</h3>
                <p className="tenue">
                  WhatsApp pide capturarlas una por una, así que cada línea tiene su propio botón.
                </p>
                {borrador.options.map((opcion, indice) => (
                  <div key={opcion.shiftId} className="copiable">
                    <code>
                      <span className="tenue">{indice + 1}.</span> {opcion.text}
                    </code>
                    <BotonCopiar texto={opcion.text} />
                  </div>
                ))}
              </div>

              <div className="tarjeta seccion-color morado" style={{ marginBottom: '1rem' }}>
                <h3>¿Prefieres un mensaje normal?</h3>
                <p className="tenue">
                  Todo junto en un bloque, para pegarlo como mensaje de texto en vez de encuesta.
                </p>
                <pre className="bloque">{borrador.plainText}</pre>
                <BotonCopiar texto={borrador.plainText} etiqueta="Copiar todo el mensaje" />
              </div>

              <div className="tarjeta seccion-color naranja">
                <h3>Mensaje para el grupo Suplencias</h3>
                <p className="tenue">
                  Los mismos turnos, pedidos como apoyo y diciendo dónde está el exhibidor: en ese
                  grupo hay participantes de otros puntos, que no sabrían a dónde llegar. La
                  ubicación sale del nombre y la dirección registrados en este punto.
                </p>
                <pre className="bloque">{borrador.substitutesText}</pre>
                <BotonCopiar
                  texto={borrador.substitutesText}
                  etiqueta="Copiar mensaje de suplencias"
                />
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
