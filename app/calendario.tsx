'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchMonthCalendar, generateMonth } from '@/lib/services/calendar';
import type { CalendarShift } from '@/lib/types';
import { rangoTurno } from '@/lib/horas';
import { ocupacionTexto } from '@/lib/turnos';
import { RegenerarDialogo } from './regenerar-dialogo';
import { MONTH_NAMES, WEEKDAY_NAMES } from '@/lib/calendar-labels';
import { errorMessage } from '@/lib/errors';

function diaSemana(fecha: string): string {
  // La fecha viene como AAAA-MM-DD y representa el día local del punto.
  const [year, month, day] = fecha.split('-').map(Number);
  return WEEKDAY_NAMES[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
}

/** Sábado o domingo: llevan otro tono para ubicarlos de un vistazo en el mes. */
function isWeekend(fecha: string): boolean {
  const dia = diaSemana(fecha);
  return dia === 'sábado' || dia === 'domingo';
}

/** Qué tan cubierto está el turno; es la clase de su etiqueta y de su franja. */
function shiftLevel(shift: CalendarShift, minCapacity: number): string {
  if (shift.occupied >= shift.capacity) return 'completo';
  if (shift.occupied >= minCapacity) return '';
  return shift.occupied === 0 ? 'critico' : 'faltante';
}

export function Calendario({ locationId, minCapacity }: { locationId: string; minCapacity: number }) {
  const hoy = new Date();
  const [year, setYear] = useState(hoy.getFullYear());
  const [month, setMonth] = useState(hoy.getMonth() + 1);
  const [shifts, setShifts] = useState<CalendarShift[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [soloIncompletos, setSoloIncompletos] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setShifts(await fetchMonthCalendar(locationId, year, month));
    } catch (problem) {
      setError(errorMessage(problem, 'No se pudo cargar el calendario'));
    } finally {
      setCargando(false);
    }
  }, [locationId, year, month]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  /**
   * Un mes ya publicado no se regenera sin avisar.
   *
   * Regenerar no borra nada, pero sienta gente en turnos sin notificarle y
   * puede crear turnos si las franjas del punto cambiaron. Hacerlo de un clic,
   * sin decir qué cambia, es lo que convierte un botón útil en uno temido.
   */
  function pedirGenerar() {
    if (shifts.length > 0) {
      setConfirmando(true);
      return;
    }
    void generar();
  }

  async function generar() {
    setConfirmando(false);
    setError(null);
    setAviso(null);
    try {
      const resultado = await generateMonth(locationId, year, month);

      // Volver a generar un mes ya publicado no crea turnos, pero sí completa
      // los que les faltaba un titular. Decir solo «0 turnos creados» hacía
      // parecer que no había pasado nada.
      const partes = [`${resultado.shiftsCreated} turno(s) nuevo(s)`];
      if (resultado.shiftsFilled > 0) {
        partes.push(`${resultado.shiftsFilled} turno(s) ya publicado(s) completado(s)`);
      }
      partes.push(`${resultado.assignmentsCreated} asignación(es) fija(s)`);
      if (resultado.formerHoldersReleased > 0) {
        partes.push(
          `${resultado.formerHoldersReleased} fecha(s) retirada(s) a quien ya no es titular`,
        );
      }
      if (resultado.holdersNotSeated > 0) {
        partes.push(
          `${resultado.holdersNotSeated} titular(es) sin lugar por una cobertura ya registrada`,
        );
      }
      const sinCambios =
        resultado.assignmentsCreated === 0 &&
        resultado.shiftsCreated === 0 &&
        resultado.formerHoldersReleased === 0;
      setAviso(
        `${partes.join(' · ')}.` +
          (sinCambios ? ' Todo estaba al día con los turnos fijos.' : ''),
      );
      await cargar();
    } catch (problem) {
      setError(errorMessage(problem, 'No se pudo generar el calendario'));
    }
  }

  const visibles = soloIncompletos
    ? shifts.filter((shift) => shift.occupied < minCapacity && shift.status !== 'CANCELLED')
    : shifts;

  const porDia = visibles.reduce<Record<string, CalendarShift[]>>((grupos, shift) => {
    (grupos[shift.date] ??= []).push(shift);
    return grupos;
  }, {});

  const incompletos = shifts.filter(
    (shift) => shift.occupied < minCapacity && shift.status !== 'CANCELLED',
  ).length;

  return (
    <section>
      <div className="tarjeta seccion-color azul month-controls">
        <label style={{ marginBottom: 0, width: 130 }}>
          <span>Mes</span>
          <select value={month} onChange={(event) => setMonth(Number(event.target.value))}>
            {MONTH_NAMES.map((nombre, indice) => (
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
        <button onClick={pedirGenerar}>
          {shifts.length > 0 ? 'Volver a generar' : 'Generar calendario'}
        </button>
        <label className="month-controls-check">
          <input
            type="checkbox"
            checked={soloIncompletos}
            onChange={(event) => setSoloIncompletos(event.target.checked)}
            style={{ width: 'auto' }}
          />
          <span style={{ margin: 0 }}>Solo turnos incompletos</span>
        </label>
      </div>

      {error && <div className="aviso error">{error}</div>}
      {aviso && <div className="aviso exito">{aviso}</div>}

      <p className="tenue">
        {cargando
          ? 'Cargando…'
          : `${shifts.length} turno(s) en el mes · ${incompletos} por debajo del mínimo de ${minCapacity}`}
      </p>

      {Object.entries(porDia).map(([fecha, turnos]) => (
        <div
          key={fecha}
          className={`tarjeta seccion-color ${isWeekend(fecha) ? 'azul' : 'verde'}`}
          style={{ marginBottom: '0.75rem' }}
        >
          <h3 style={{ textTransform: 'capitalize' }}>
            {diaSemana(fecha)} {Number(fecha.slice(8))} de {MONTH_NAMES[Number(fecha.slice(5, 7)) - 1]}
          </h3>
          {/* Lista y no tabla: tres columnas no caben en un teléfono sin
              desplazarse de lado, y aquí cada turno baja a dos renglones. */}
          <ul className="month-shifts">
            {turnos.map((shift) => {
              const level = shiftLevel(shift, minCapacity);
              return (
                <li key={shift.id} className={`month-shift ${level}`}>
                  <strong className="month-shift-range">{rangoTurno(shift)}</strong>
                  <span className={`etiqueta ${level}`}>
                    {ocupacionTexto(shift.occupied, shift.capacity)}
                  </span>
                  <div className="month-shift-people">
                    {shift.status === 'CANCELLED' ? (
                      <span className="etiqueta critico">Turno cancelado</span>
                    ) : shift.participants.length === 0 ? (
                      <span className="tenue">Sin asignar</span>
                    ) : (
                      shift.participants.map((person, index) => (
                        <span key={`${person.name}-${index}`} className="month-shift-person">
                          {person.name}
                          {person.isCaptain && <span className="insignia-capitan">Capitán</span>}
                          {person.origin === 'COVERAGE' && (
                            <span className="tenue"> (cubre)</span>
                          )}
                          {person.confirmed && (
                            <span className="marca" title="Confirmó su asistencia">
                              {' '}
                              ✓
                            </span>
                          )}
                        </span>
                      ))
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      {!cargando && shifts.length === 0 && (
        <div className="aviso atencion">
          No hay turnos generados para este mes. Usa «Generar calendario» para crearlos a partir
          de las plantillas.
        </div>
      )}

      {confirmando && (
        <RegenerarDialogo
          mes={`${MONTH_NAMES[month - 1]} de ${year}`}
          shifts={shifts}
          releasesFormerHolders={
            year * 12 + month > hoy.getFullYear() * 12 + hoy.getMonth() + 1
          }
          onConfirmar={generar}
          onCerrar={() => setConfirmando(false)}
        />
      )}
    </section>
  );
}
