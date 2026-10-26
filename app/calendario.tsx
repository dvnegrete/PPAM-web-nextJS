'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { CalendarShift } from '@/lib/types';
import { rangoTurno } from '@/lib/horas';
import { ocupacionTexto } from '@/lib/turnos';
import { RegenerarDialogo } from './regenerar-dialogo';

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

function diaSemana(fecha: string): string {
  // La fecha viene como AAAA-MM-DD y representa el día local del punto.
  const [year, month, day] = fecha.split('-').map(Number);
  return DIAS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
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
      setShifts(
        await api<CalendarShift[]>(
          `/locations/${locationId}/calendar?year=${year}&month=${month}`,
        ),
      );
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'No se pudo cargar el calendario');
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
      const resultado = await api<{
        shiftsCreated: number;
        shiftsExisting: number;
        shiftsFilled: number;
        assignmentsCreated: number;
      }>(`/locations/${locationId}/calendar/generate`, { method: 'POST', body: { year, month } });

      // Volver a generar un mes ya publicado no crea turnos, pero sí completa
      // los que les faltaba un titular. Decir solo «0 turnos creados» hacía
      // parecer que no había pasado nada.
      const partes = [`${resultado.shiftsCreated} turno(s) nuevo(s)`];
      if (resultado.shiftsFilled > 0) {
        partes.push(`${resultado.shiftsFilled} turno(s) ya publicado(s) completado(s)`);
      }
      partes.push(`${resultado.assignmentsCreated} asignación(es) fija(s)`);
      setAviso(
        `${partes.join(' · ')}.` +
          (resultado.assignmentsCreated === 0 && resultado.shiftsCreated === 0
            ? ' Todo estaba al día: no había titulares pendientes de sentar.'
            : ''),
      );
      await cargar();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'No se pudo generar el calendario');
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
        <button onClick={pedirGenerar}>
          {shifts.length > 0 ? 'Volver a generar' : 'Generar calendario'}
        </button>
        <label style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '0.4rem', width: 'auto' }}>
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
        <div key={fecha} className="tarjeta" style={{ marginBottom: '0.75rem' }}>
          <h3 style={{ textTransform: 'capitalize' }}>
            {diaSemana(fecha)} {fecha.slice(8)} de {MESES[Number(fecha.slice(5, 7)) - 1]}
          </h3>
          <table>
            <thead>
              <tr>
                <th style={{ width: 170 }}>Horario</th>
                <th className="numero" style={{ width: 80 }}>Cupo</th>
                <th>Participantes</th>
              </tr>
            </thead>
            <tbody>
              {turnos.map((shift) => (
                <tr key={shift.id}>
                  <td>{rangoTurno(shift)}</td>
                  <td className="numero">
                    <span
                      className={`etiqueta ${
                        shift.occupied >= shift.capacity
                          ? 'completo'
                          : shift.occupied >= minCapacity
                            ? ''
                            : shift.occupied === 0
                              ? 'critico'
                              : 'faltante'
                      }`}
                    >
                      {ocupacionTexto(shift.occupied, shift.capacity)}
                    </span>
                  </td>
                  <td>
                    {shift.status === 'CANCELLED' ? (
                      <span className="etiqueta critico">Turno cancelado</span>
                    ) : shift.participants.length === 0 ? (
                      <span className="tenue">Sin asignar</span>
                    ) : (
                      shift.participants
                        .map((p) => `${p.name}${p.confirmed ? ' ✓' : ''}${p.origin === 'COVERAGE' ? ' (cubre)' : ''}`)
                        .join(' · ')
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
          mes={`${MESES[month - 1]} de ${year}`}
          shifts={shifts}
          onConfirmar={generar}
          onCerrar={() => setConfirmando(false)}
        />
      )}
    </section>
  );
}
