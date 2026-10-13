'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { AttendanceRow, AuditEntry, MonthlySummary } from '@/lib/types';

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const ACCIONES: Record<string, string> = {
  'assignment.cancelled': 'Cancelación de turno',
  'assignment.confirmed': 'Confirmación de asistencia',
  'coverage.opened': 'Vacante abierta',
  'coverage.broadcast': 'Vacante difundida',
  'coverage.offered': 'Ofrecimiento recibido',
  'coverage.approved': 'Cobertura aprobada',
  'coverage.auto_approved': 'Cobertura aprobada por el sistema',
  'coverage.declined': 'Ofrecimiento descartado',
  'coverage.expired': 'Vacante vencida',
  'task.auto_resolved': 'Solicitud resuelta por el sistema',
  'task.escalated': 'Solicitud escalada',
  'task.resolved': 'Solicitud atendida',
  'shift.cancelled': 'Turno cancelado',
  'shift.kept': 'Turno sostenido',
  'supervisor.available': 'Encargado disponible',
  'supervisor.unavailable': 'Encargado no disponible',
  'import.run': 'Importación',
};

export function Reportes({ locationId }: { locationId: string }) {
  const hoy = new Date();
  const [year, setYear] = useState(hoy.getFullYear());
  const [month, setMonth] = useState(hoy.getMonth() + 1);
  const [resumen, setResumen] = useState<MonthlySummary | null>(null);
  const [asistencia, setAsistencia] = useState<AttendanceRow[]>([]);
  const [bitacora, setBitacora] = useState<AuditEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      const desde = new Date(Date.UTC(year, month - 1, 1)).toISOString();
      const hasta = new Date(Date.UTC(year, month, 0, 23, 59, 59)).toISOString();

      const [resumenData, asistenciaData, bitacoraData] = await Promise.all([
        api<MonthlySummary>(`/locations/${locationId}/reports/monthly?year=${year}&month=${month}`),
        api<AttendanceRow[]>(
          `/locations/${locationId}/reports/attendance?from=${desde}&to=${hasta}`,
        ),
        api<AuditEntry[]>('/audit?limit=40'),
      ]);

      setResumen(resumenData);
      setAsistencia(asistenciaData);
      setBitacora(bitacoraData);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'No se pudieron cargar los reportes');
    }
  }, [locationId, year, month]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return (
    <section>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'end', marginBottom: '1rem' }}>
        <label style={{ marginBottom: 0, width: 130 }}>
          <span>Mes</span>
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {MESES.map((nombre, indice) => (
              <option key={nombre} value={indice + 1}>{nombre}</option>
            ))}
          </select>
        </label>
        <label style={{ marginBottom: 0, width: 100 }}>
          <span>Año</span>
          <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} />
        </label>
      </div>

      {error && <div className="aviso error">{error}</div>}

      {resumen && (
        <details className="tarjeta plegable">
          <summary>
            Resumen de {MESES[resumen.month - 1]} de {resumen.year}
            <span className="etiqueta completo">{resumen.totalShifts} turnos</span>
            {resumen.understaffedShifts > 0 && (
              <span className="etiqueta faltante">
                {resumen.understaffedShifts} bajo el mínimo
              </span>
            )}
          </summary>
          <table>
            <tbody>
              <tr><td>Turnos programados</td><td className="numero">{resumen.totalShifts}</td></tr>
              <tr><td>Con el mínimo cubierto</td><td className="numero">{resumen.fullyStaffedShifts}</td></tr>
              <tr><td>Por debajo del mínimo</td><td className="numero">{resumen.understaffedShifts}</td></tr>
              <tr><td>Turnos cancelados</td><td className="numero">{resumen.cancelledShifts}</td></tr>
              <tr><td>Participaciones</td><td className="numero">{resumen.totalAssignments}</td></tr>
              <tr><td>Cancelaciones de participantes</td><td className="numero">{resumen.cancellations}</td></tr>
              <tr><td>Turnos cubiertos por otra persona</td><td className="numero">{resumen.coverages}</td></tr>
              <tr>
                <td>Vacantes publicadas</td>
                <td className="numero">
                  {resumen.coverageRequests} ({resumen.coverageRequestsFulfilled} cubiertas,{' '}
                  {resumen.coverageRequestsExpired} vencidas)
                </td>
              </tr>
            </tbody>
          </table>
        </details>
      )}

      <div className="tarjeta" style={{ marginBottom: '1rem' }}>
        <h3>Participación por persona</h3>
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th className="numero">Atendidos</th>
              <th className="numero">Cancelados</th>
              <th className="numero">Cubrió a otros</th>
              <th className="numero">Próximos</th>
            </tr>
          </thead>
          <tbody>
            {asistencia.map((fila) => (
              <tr key={fila.participantId}>
                <td>{fila.fullName}</td>
                <td className="numero">{fila.served}</td>
                <td className="numero">{fila.cancelled}</td>
                <td className="numero">{fila.covered}</td>
                <td className="numero">{fila.upcoming}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {asistencia.length === 0 && <p className="tenue">Sin datos en el periodo.</p>}
      </div>

      <div className="tarjeta">
        <h3>Bitácora</h3>
        <table>
          <thead>
            <tr>
              <th style={{ width: 160 }}>Cuándo</th>
              <th>Acción</th>
              <th>Quién</th>
            </tr>
          </thead>
          <tbody>
            {bitacora.map((entrada) => (
              <tr key={entrada.id}>
                <td className="tenue">
                  {new Date(entrada.createdAt).toLocaleString('es-MX', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </td>
                <td>{ACCIONES[entrada.action] ?? entrada.action}</td>
                <td>
                  {entrada.actorType === 'SYSTEM' ? (
                    <span className="etiqueta">Sistema</span>
                  ) : (
                    (entrada.actorName ?? entrada.actorType)
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {bitacora.length === 0 && <p className="tenue">Sin movimientos registrados.</p>}
      </div>
    </section>
  );
}
