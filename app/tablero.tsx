'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type {
  AvailableParticipant,
  Dashboard,
  DashboardShift,
  ExternalCover,
  Movement,
} from '@/lib/types';
import { CANCEL_REASONS } from '@/lib/types';
import { AgregarParticipante } from './agregar-participante';
import { CalendarioMes } from './calendario-mes';
import { CancelarDialogo } from './cancelar-dialogo';
import { fechaCorta, TurnoDetalle } from './turno-detalle';

type Vista = 'calendario' | 'lista';
type RangoLista = '7d' | '14d';

const ETIQUETA_RANGO: Record<RangoLista, string> = {
  '7d': 'Próximos 7 días',
  '14d': 'Próximos 14 días',
};

function rangoDeLista(rango: RangoLista): { from: Date; to: Date } {
  const desde = new Date();
  desde.setHours(0, 0, 0, 0);
  const hasta = new Date(desde);
  hasta.setDate(hasta.getDate() + (rango === '7d' ? 7 : 14));
  hasta.setHours(23, 59, 59, 0);
  return { from: desde, to: hasta };
}

function rangoDeMes(year: number, month: number): { from: Date; to: Date } {
  return {
    from: new Date(year, month, 1),
    to: new Date(year, month + 1, 0, 23, 59, 59),
  };
}

export function Tablero({ locationId }: { locationId: string }) {
  const hoy = new Date();
  const [vista, setVista] = useState<Vista>('calendario');
  const [mes, setMes] = useState({ year: hoy.getFullYear(), month: hoy.getMonth() });
  const [rangoLista, setRangoLista] = useState<RangoLista>('7d');
  const [diaAbierto, setDiaAbierto] = useState<string | null>(null);

  const [datos, setDatos] = useState<Dashboard | null>(null);
  const [movimientos, setMovimientos] = useState<Movement[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  const [cancelando, setCancelando] = useState<{
    assignmentId: string;
    nombre: string;
    turno: string;
    /** Su cónyuge, si atiende este mismo turno. */
    conyuge: string | null;
  } | null>(null);
  const [agregando, setAgregando] = useState<DashboardShift | null>(null);
  const [historialDe, setHistorialDe] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      const { from, to } =
        vista === 'calendario' ? rangoDeMes(mes.year, mes.month) : rangoDeLista(rangoLista);

      const [tablero, actividad] = await Promise.all([
        api<Dashboard>(
          `/locations/${locationId}/dashboard?from=${from.toISOString()}&to=${to.toISOString()}`,
        ),
        api<Movement[]>(`/locations/${locationId}/movements?limit=8`),
      ]);
      setDatos(tablero);
      setMovimientos(actividad);
    } catch (problema) {
      setError(problema instanceof Error ? problema.message : 'No se pudo cargar el tablero');
    } finally {
      setCargando(false);
    }
  }, [locationId, vista, mes, rangoLista]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  // Al abrir el mes en curso, se muestra el detalle de hoy sin tener que tocarlo.
  useEffect(() => {
    if (vista !== 'calendario' || diaAbierto) return;
    const ahora = new Date();
    if (ahora.getFullYear() === mes.year && ahora.getMonth() === mes.month) {
      setDiaAbierto(
        `${mes.year}-${String(mes.month + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`,
      );
    }
  }, [vista, mes, diaAbierto]);

  async function cancelar(reasonCode: string, reason: string, tambienConyuge: boolean) {
    if (!cancelando) return;
    const { spouseCancelled } = await api<{ ok: true; spouseCancelled: string | null }>(
      `/assignments/${cancelando.assignmentId}/cancel`,
      {
        method: 'POST',
        body: { reasonCode, reason: reason || undefined, cancelSpouse: tambienConyuge },
      },
    );
    // Se confirma a quién alcanzó la baja: el segundo nombre no se ve en el
    // diálogo, y sin decirlo quedaría la duda de si entró.
    setAviso(
      spouseCancelled
        ? `Se cancelaron los turnos de ${cancelando.nombre} y ${spouseCancelled}.`
        : `Se canceló el turno de ${cancelando.nombre}.`,
    );
    setCancelando(null);
    await cargar();
  }

  /**
   * Los candidatos del turno abierto.
   *
   * Va en `useCallback` porque es dependencia del efecto que los carga en el
   * diálogo: como lambda suelta se recreaba en cada repintado del Tablero y
   * volvía a pedir el padrón entero cada vez.
   */
  const cargarCandidatos = useCallback(async () => {
    if (!agregando) return [];
    return api<AvailableParticipant[]>(
      `/locations/${locationId}/shifts/${agregando.id}/available-participants`,
    );
  }, [locationId, agregando]);

  async function agregar(participantId: string) {
    if (!agregando) return;
    await registrarCobertura({ participantId });
  }

  /**
   * Registra a quien cubre sin estar en el padrón de este punto.
   *
   * El servidor resuelve si hay que crear su registro mínimo o reutilizar el que
   * ya tenga, por su teléfono; aquí solo se mandan los datos capturados.
   */
  async function agregarExterno(datos: ExternalCover) {
    if (!agregando) return;
    await registrarCobertura({
      external: {
        firstName: datos.firstName.trim(),
        paternalSurname: datos.paternalSurname.trim(),
        phone: datos.phone.trim(),
        note: datos.note.trim() || undefined,
      },
    });
  }

  async function registrarCobertura(body: Record<string, unknown>) {
    if (!agregando) return;
    await api(`/locations/${locationId}/shifts/${agregando.id}/assignments`, {
      method: 'POST',
      body,
    });
    setAgregando(null);
    await cargar();
  }

  /**
   * Abre la cancelación sabiendo si su cónyuge atiende **este mismo** turno.
   *
   * No hace falta consultar nada: si los dos están en el turno, los dos vienen
   * en `turno.participants`, y cada uno trae su `spouseId`.
   */
  function abrirCancelacion(turno: DashboardShift, turnoTexto: string) {
    return (assignmentId: string, nombre: string) => {
      const persona = turno.participants.find((p) => p.assignmentId === assignmentId);
      const conyuge = persona?.spouseId
        ? (turno.participants.find((p) => p.participantId === persona.spouseId)?.name ?? null)
        : null;
      setCancelando({ assignmentId, nombre, turno: turnoTexto, conyuge });
    };
  }

  const resumen = datos?.summary;
  const diaDetalle = datos?.days.find((dia) => dia.date === diaAbierto) ?? null;

  return (
    <section>
      {error && <div className="aviso error">{error}</div>}
      {aviso && <div className="aviso exito">{aviso}</div>}

      <div className="tablero-barra">
        <div className="segmentado" role="group" aria-label="Vista">
          <button
            onClick={() => setVista('calendario')}
            className={vista === 'calendario' ? 'primario' : ''}
            aria-pressed={vista === 'calendario'}
          >
            Calendario
          </button>
          <button
            onClick={() => setVista('lista')}
            className={vista === 'lista' ? 'primario' : ''}
            aria-pressed={vista === 'lista'}
          >
            Lista
          </button>
        </div>

        {vista === 'lista' && (
          <div className="segmentado" role="group" aria-label="Periodo">
            {(['7d', '14d'] as RangoLista[]).map((opcion) => (
              <button
                key={opcion}
                onClick={() => setRangoLista(opcion)}
                className={rangoLista === opcion ? 'primario' : ''}
                aria-pressed={rangoLista === opcion}
              >
                {ETIQUETA_RANGO[opcion]}
              </button>
            ))}
          </div>
        )}

        <button onClick={() => void cargar()} disabled={cargando}>
          Actualizar
        </button>
      </div>

      {resumen && (
        <div className="resumen">
          <div className="metrica">
            <span className="cifra">{resumen.totalShifts}</span>
            <span className="rotulo">turnos en el periodo</span>
          </div>
          <div className={`metrica ${resumen.understaffed > 0 ? 'atencion' : ''}`}>
            <span className="cifra">{resumen.understaffed}</span>
            <span className="rotulo">les falta una persona</span>
          </div>
          <div className={`metrica ${resumen.critical > 0 ? 'alerta' : ''}`}>
            <span className="cifra">{resumen.critical}</span>
            <span className="rotulo">con una o menos</span>
          </div>
          <div className="metrica">
            <span className="cifra">{resumen.cancellations}</span>
            <span className="rotulo">cancelaciones</span>
          </div>
        </div>
      )}

      {movimientos.length > 0 && (
        <details className="tarjeta actividad">
          <summary>
            Actividad reciente · lo último fue {movimientos[0].description.toLowerCase()}
          </summary>
          <ul className="lista-movimientos">
            {movimientos.map((movimiento) => (
              <li key={movimiento.id}>
                <span>{movimiento.description}</span>
                <span className="tenue">
                  {fechaCorta(movimiento.at)} · registró {movimiento.by}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {cargando && <p className="tenue">Cargando…</p>}

      {!cargando && vista === 'calendario' && datos && (
        <div className="calendario-con-detalle">
          <CalendarioMes
            year={mes.year}
            month={mes.month}
            days={datos.days}
            seleccionado={diaAbierto}
            onSeleccionar={(fecha) => {
              setDiaAbierto(fecha === diaAbierto ? null : fecha);
              setHistorialDe(null);
            }}
            onCambiarMes={(year, month) => {
              setMes({ year, month });
              setDiaAbierto(null);
            }}
          />

          <div className="detalle-dia">
            {diaDetalle ? (
              <div className="tarjeta dia">
                <h3>{diaDetalle.label}</h3>
                {diaDetalle.shifts.map((turno) => (
                  <TurnoDetalle
                    key={turno.id}
                    turno={turno}
                    etiquetaDia={diaDetalle.label}
                    historialAbierto={historialDe === turno.id}
                    onAlternarHistorial={() =>
                      setHistorialDe(historialDe === turno.id ? null : turno.id)
                    }
                    onCancelar={abrirCancelacion(turno, `${diaDetalle.label}, ${turno.range}`)}
                    onAgregar={() => setAgregando(turno)}
                  />
                ))}
              </div>
            ) : (
              <div className="tarjeta vacio">
                <p className="tenue">
                  Toca un día del calendario para ver sus turnos y a quién le toca.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {!cargando && vista === 'lista' && (
        <>
          {datos?.days.length === 0 && (
            <div className="aviso atencion">
              No hay turnos generados en este periodo. Genera el calendario del mes desde la
              pestaña Calendario.
            </div>
          )}

          {datos?.days.map((dia) => (
            <div key={dia.date} className="tarjeta dia">
              <h3>{dia.label}</h3>
              {dia.shifts.map((turno) => (
                <TurnoDetalle
                  key={turno.id}
                  turno={turno}
                  etiquetaDia={dia.label}
                  historialAbierto={historialDe === turno.id}
                  onAlternarHistorial={() =>
                    setHistorialDe(historialDe === turno.id ? null : turno.id)
                  }
                  onCancelar={abrirCancelacion(turno, `${dia.label}, ${turno.range}`)}
                  onAgregar={() => setAgregando(turno)}
                />
              ))}
            </div>
          ))}
        </>
      )}

      {cancelando && (
        <CancelarDialogo
          nombre={cancelando.nombre}
          conyuge={cancelando.conyuge}
          turno={cancelando.turno}
          motivos={CANCEL_REASONS}
          onCancelar={cancelar}
          onCerrar={() => setCancelando(null)}
        />
      )}

      {agregando && (
        <AgregarParticipante
          locationId={locationId}
          shift={agregando}
          cargarCandidatos={cargarCandidatos}
          onAgregar={agregar}
          onAgregarExterno={agregarExterno}
          onCerrar={() => setAgregando(null)}
        />
      )}
    </section>
  );
}
