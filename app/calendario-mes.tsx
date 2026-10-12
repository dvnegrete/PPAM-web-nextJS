'use client';

import type { DashboardDay, NeedLevel } from '@/lib/types';
import { ocupacionTexto } from '@/lib/turnos';

const DIAS_CABECERA = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/** Nombre del estado, para el texto que leen los lectores de pantalla. */
const NOMBRE_ESTADO: Record<NeedLevel, string> = {
  ok: 'completo',
  bajoCupo: 'falta una persona',
  bajoMinimo: 'falta gente',
  cancelado: 'cancelado',
};

interface Props {
  year: number;
  month: number;
  days: DashboardDay[];
  seleccionado: string | null;
  onSeleccionar: (fecha: string) => void;
  onCambiarMes: (year: number, month: number) => void;
}

/** AAAA-MM-DD sin pasar por UTC, que correría el día según la zona horaria. */
function claveFecha(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Mes completo con un punto por turno.
 *
 * Cada día muestra tantos puntos como turnos tiene, coloreados por su ocupación:
 * verde si está completo, ámbar si le falta una persona y rojo si quedó en uno o
 * ninguno. La idea es ver dónde están los huecos sin abrir nada; el detalle se
 * despliega al tocar el día.
 */
export function CalendarioMes({
  year,
  month,
  days,
  seleccionado,
  onSeleccionar,
  onCambiarMes,
}: Props) {
  const porFecha = new Map(days.map((dia) => [dia.date, dia]));

  const primero = new Date(year, month, 1);
  const diasDelMes = new Date(year, month + 1, 0).getDate();
  // La rejilla empieza en lunes; getDay() usa 0 = domingo.
  const huecoInicial = (primero.getDay() + 6) % 7;

  const hoy = new Date();
  const claveHoy = claveFecha(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

  const celdas: Array<{ dia: number; clave: string } | null> = [
    ...Array.from({ length: huecoInicial }, () => null),
    ...Array.from({ length: diasDelMes }, (_, indice) => ({
      dia: indice + 1,
      clave: claveFecha(year, month, indice + 1),
    })),
  ];

  function mover(delta: number) {
    const destino = new Date(year, month + delta, 1);
    onCambiarMes(destino.getFullYear(), destino.getMonth());
  }

  return (
    <div className="calendario">
      <div className="calendario-cabecera">
        <button onClick={() => mover(-1)} aria-label="Mes anterior">
          ‹
        </button>
        <h3>
          {MESES[month]} {year}
        </h3>
        <button onClick={() => mover(1)} aria-label="Mes siguiente">
          ›
        </button>
      </div>

      <div className="leyenda">
        <span>
          <i className="punto ok" /> completo
        </span>
        <span>
          <i className="punto bajoCupo" /> falta 1
        </span>
        <span>
          <i className="punto bajoMinimo" /> falta gente
        </span>
      </div>

      <div className="rejilla">
        {DIAS_CABECERA.map((letra, indice) => (
          <div key={`${letra}-${indice}`} className="rejilla-dow" aria-hidden="true">
            {letra}
          </div>
        ))}

        {celdas.map((celda, indice) => {
          if (!celda) return <div key={`hueco-${indice}`} className="celda vacia" />;

          const dia = porFecha.get(celda.clave);
          const turnos = dia?.shifts ?? [];
          const faltantes = turnos.filter((turno) => turno.need !== 'ok').length;
          const esHoy = celda.clave === claveHoy;

          const descripcion =
            turnos.length === 0
              ? 'sin turnos'
              : faltantes === 0
                ? `${turnos.length} turnos, todos completos`
                : `${faltantes} de ${turnos.length} turnos necesitan gente`;

          return (
            <button
              key={celda.clave}
              className={`celda ${seleccionado === celda.clave ? 'activa' : ''} ${
                esHoy ? 'hoy' : ''
              } ${turnos.length === 0 ? 'sin-turnos' : ''}`}
              onClick={() => onSeleccionar(celda.clave)}
              aria-pressed={seleccionado === celda.clave}
              aria-label={`${celda.dia} de ${MESES[month]}: ${descripcion}`}
              disabled={turnos.length === 0}
            >
              <span className="numero">{celda.dia}</span>
              <span className="puntos">
                {turnos.map((turno) => (
                  <i
                    key={turno.id}
                    className={`punto ${turno.need}`}
                    title={`${turno.range} · ${ocupacionTexto(
                      turno.occupied,
                      turno.capacity,
                    )} · ${NOMBRE_ESTADO[turno.need]}`}
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
