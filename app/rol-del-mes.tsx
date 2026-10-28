'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { toBlob } from 'html-to-image';
import { api } from '@/lib/api';
import type { PersonaDelRol, RolMensual } from '@/lib/types';

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const DIAS_HABILES = [
  { numero: 1, nombre: 'Lunes' },
  { numero: 2, nombre: 'Martes' },
  { numero: 3, nombre: 'Miércoles' },
  { numero: 4, nombre: 'Jueves' },
  { numero: 5, nombre: 'Viernes' },
];

/**
 * Ancho real de cada imagen. WhatsApp reduce lo que pasa de ~1600 px, y por
 * debajo de 1000 los teléfonos dejan de leerse sin zoom; 1080 es el punto medio.
 */
const ANCHO_LIENZO = 1080;

/**
 * Rol del mes para el grupo de WhatsApp.
 *
 * Son dos imágenes porque los dos lados del mes se leen distinto: entre semana
 * la gente es la misma cada semana y basta una tabla, mientras que el fin de
 * semana cambia de gente cada fecha. Quien ya avisó que no va no aparece.
 */
export function RolDelMes({ locationId }: { locationId: string }) {
  const hoy = new Date();
  const [year, setYear] = useState(hoy.getFullYear());
  const [month, setMonth] = useState(hoy.getMonth() + 1);
  const [rol, setRol] = useState<RolMensual | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setRol(await api<RolMensual>(`/locations/${locationId}/roster?year=${year}&month=${month}`));
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'No se pudo cargar el rol del mes');
    } finally {
      setCargando(false);
    }
  }, [locationId, year, month]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const sufijo = `${year}-${String(month).padStart(2, '0')}`;
  const vacio = rol !== null && rol.weekdays.length === 0 && rol.weekends.length === 0;

  return (
    <section>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'end', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <label style={{ marginBottom: 0, width: 130 }}>
          <span>Mes</span>
          <select value={month} onChange={(event) => setMonth(Number(event.target.value))}>
            {MESES.map((nombre, indice) => (
              <option key={nombre} value={indice + 1}>{nombre}</option>
            ))}
          </select>
        </label>
        <label style={{ marginBottom: 0, width: 100 }}>
          <span>Año</span>
          <input
            type="number"
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
            min={2020}
            max={2100}
          />
        </label>
        <button onClick={() => void cargar()} disabled={cargando}>
          {cargando ? 'Cargando…' : 'Actualizar'}
        </button>
      </div>

      {error && <p className="aviso">{error}</p>}
      {vacio && (
        <p className="tenue">
          Este mes todavía no tiene turnos. Genéralo primero desde la pestaña Calendario.
        </p>
      )}

      {rol && !vacio && (
        <>
          <Lienzo titulo="Entre semana" archivo={`rol-entre-semana-${sufijo}.png`}>
            <ImagenEntreSemana rol={rol} />
          </Lienzo>
          <Lienzo titulo="Fines de semana" archivo={`rol-fin-de-semana-${sufijo}.png`}>
            <ImagenFinDeSemana rol={rol} />
          </Lienzo>
        </>
      )}
    </section>
  );
}

/** Vista previa escalada al ancho disponible, con sus botones de descarga. */
function Lienzo({
  titulo,
  archivo,
  children,
}: {
  titulo: string;
  archivo: string;
  children: ReactNode;
}) {
  const nodo = useRef<HTMLDivElement>(null);
  const marco = useRef<HTMLDivElement>(null);
  const [escala, setEscala] = useState(1);
  const [alto, setAlto] = useState(0);
  const [trabajando, setTrabajando] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);

  useLayoutEffect(() => {
    const medir = () => {
      if (!marco.current || !nodo.current) return;
      const nueva = Math.min(1, marco.current.clientWidth / ANCHO_LIENZO);
      setEscala(nueva);
      setAlto(nodo.current.offsetHeight * nueva);
    };
    medir();
    const observador = new ResizeObserver(medir);
    if (marco.current) observador.observe(marco.current);
    if (nodo.current) observador.observe(nodo.current);
    return () => observador.disconnect();
  }, []);

  async function imagen(): Promise<File> {
    if (!nodo.current) throw new Error('La imagen todavía no está lista');
    const blob = await toBlob(nodo.current, {
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      width: ANCHO_LIENZO,
    });
    if (!blob) throw new Error('No se pudo generar la imagen');
    return new File([blob], archivo, { type: 'image/png' });
  }

  async function descargar() {
    setTrabajando(true);
    setFallo(null);
    try {
      const file = await imagen();
      const url = URL.createObjectURL(file);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = archivo;
      enlace.click();
      URL.revokeObjectURL(url);
    } catch (problem) {
      setFallo(problem instanceof Error ? problem.message : 'No se pudo generar la imagen');
    } finally {
      setTrabajando(false);
    }
  }

  // En el teléfono, compartir abre directo la hoja para mandarla a WhatsApp.
  const puedeCompartir =
    typeof navigator !== 'undefined' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [new File([], archivo, { type: 'image/png' })] });

  async function compartir() {
    setTrabajando(true);
    setFallo(null);
    try {
      const file = await imagen();
      await navigator.share({ files: [file], title: `Rol del mes · ${titulo}` });
    } catch (problem) {
      // Cerrar la hoja de compartir no es un error.
      if (problem instanceof DOMException && problem.name === 'AbortError') return;
      setFallo(problem instanceof Error ? problem.message : 'No se pudo compartir la imagen');
    } finally {
      setTrabajando(false);
    }
  }

  return (
    <div className="tarjeta rol-tarjeta">
      <div className="rol-acciones">
        <h2 style={{ margin: 0 }}>{titulo}</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {puedeCompartir && (
            <button onClick={() => void compartir()} disabled={trabajando}>
              Compartir
            </button>
          )}
          <button className="primario" onClick={() => void descargar()} disabled={trabajando}>
            {trabajando ? 'Generando…' : 'Descargar PNG'}
          </button>
        </div>
      </div>
      {fallo && <p className="aviso">{fallo}</p>}
      <div ref={marco} className="rol-marco" style={{ height: alto || undefined }}>
        <div style={{ transform: `scale(${escala})`, transformOrigin: 'top left', width: ANCHO_LIENZO }}>
          <div ref={nodo} className="rol-lienzo">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function Encabezado({ rol, subtitulo }: { rol: RolMensual; subtitulo: string }) {
  return (
    <header className="rol-encabezado">
      <div>
        <div className="rol-punto">{rol.locationName}</div>
        <div className="rol-titulo">Rol de {rol.monthLabel}</div>
      </div>
      <div className="rol-subtitulo">{subtitulo}</div>
    </header>
  );
}

function Persona({ persona }: { persona: PersonaDelRol }) {
  return (
    <div className="rol-persona">
      <div className="rol-nombre">{persona.name}</div>
      <div className="rol-telefono">{persona.phone}</div>
    </div>
  );
}

function Faltan({ cuantos }: { cuantos: number }) {
  if (cuantos <= 0) return null;
  return (
    <div className="rol-falta">
      {cuantos === 1 ? '1 lugar disponible' : `${cuantos} lugares disponibles`}
    </div>
  );
}

function PieDeImagen() {
  const fecha = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
  return <footer className="rol-pie">Actualizado el {fecha}</footer>;
}

function ImagenEntreSemana({ rol }: { rol: RolMensual }) {
  return (
    <>
      <Encabezado rol={rol} subtitulo="Lunes a viernes · se repite todas las semanas" />
      <table className="rol-tabla">
        <thead>
          <tr>
            <th className="rol-hora">Horario</th>
            {DIAS_HABILES.map((dia) => (
              <th key={dia.numero}>{dia.nombre}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rol.weekdays.map((franja) => (
            <tr key={franja.startMinute}>
              <td className="rol-hora">{franja.range}</td>
              {DIAS_HABILES.map((dia) => {
                const celda = franja.days[dia.numero];
                return (
                  <td key={dia.numero}>
                    {celda?.people.map((persona) => (
                      <Persona key={persona.phone} persona={persona} />
                    ))}
                    {celda ? <Faltan cuantos={celda.missing} /> : <span className="rol-falta">Sin turno</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {rol.weekdayChanges.length > 0 && (
        <div className="rol-cambios">
          <div className="rol-cambios-titulo">Fechas con cambios · ese día van:</div>
          {rol.weekdayChanges.map((cambio) => (
            <div key={`${cambio.date}-${cambio.range}`} className="rol-cambio">
              <div className="rol-cambio-fecha">
                {cambio.label}
                <span>{cambio.range}</span>
              </div>
              <div className="rol-fila-personas">
                {cambio.cancelled ? (
                  <div className="rol-falta">Turno cancelado</div>
                ) : (
                  <>
                    {cambio.attendees.map((persona) => (
                      <Persona key={persona.phone} persona={persona} />
                    ))}
                    <Faltan cuantos={cambio.missing} />
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <PieDeImagen />
    </>
  );
}

function ImagenFinDeSemana({ rol }: { rol: RolMensual }) {
  return (
    <>
      <Encabezado rol={rol} subtitulo="Sábados y domingos" />
      {rol.weekends.map((finde) => (
        <div key={finde.label} className="rol-finde">
          <div className="rol-finde-titulo">{finde.label}</div>
          <div className="rol-finde-dias">
            {finde.days.map((dia) => (
              <div key={dia.date} className="rol-finde-dia">
                <div className="rol-finde-dia-titulo">{dia.label}</div>
                {dia.slots.map((franja) => (
                  <div key={franja.startMinute} className="rol-finde-franja">
                    <div className="rol-hora">{franja.range}</div>
                    <div className="rol-fila-personas">
                      {franja.people.map((persona) => (
                        <Persona key={persona.phone} persona={persona} />
                      ))}
                      <Faltan cuantos={franja.missing} />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ))}
      <PieDeImagen />
    </>
  );
}
