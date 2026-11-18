'use client';

import { useEffect, useMemo, useState } from 'react';
import { groupSlots, WEEK_ORDINALS } from '@/lib/recurring-slots';
import { Rejilla } from './recurring-grid';
import { ElegirTitular } from './recurring-holder-picker';
import { RecurringRemovalDialog } from './recurring-removal-dialog';
import { RecurringSyncBanner } from './recurring-sync-banner';
import { useRecurringSlots } from './use-recurring-slots';

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
  const {
    datos,
    cargando,
    error,
    eligiendo,
    setEligiendo,
    quitando,
    marcando,
    pendingRemoval,
    requestRemoval,
    cancelRemoval,
    quitar,
    agregar,
    marcarCapitan,
    cargarCandidatos,
    aplicando,
    applyError,
    applySummary,
    aplicar,
  } = useRecurringSlots(locationId);
  const [semana, setSemana] = useState(0);

  const bloques = useMemo(() => groupSlots(datos?.slots ?? []), [datos]);

  // La primera pestaña de semana se elige sola: así la sección no arranca vacía.
  useEffect(() => {
    if (semana === 0 && bloques.weeksAvailable.length > 0) {
      setSemana(bloques.weeksAvailable[0]);
    }
  }, [bloques.weeksAvailable, semana]);

  if (cargando) return <p className="tenue">Cargando turnos fijos…</p>;

  const sinTurno = (datos?.padron ?? []).filter((persona) => persona.recurringCount === 0);
  const totalTitulares = (datos?.slots ?? []).reduce((suma, slot) => suma + slot.holders.length, 0);
  const totalLugares = (datos?.slots ?? []).reduce((suma, slot) => suma + slot.capacity, 0);

  return (
    <section>
      {error && <div className="aviso error">{error}</div>}

      <RecurringSyncBanner
        months={datos?.pendingMonths ?? []}
        busy={aplicando}
        error={applyError}
        summary={applySummary}
        onApply={aplicar}
      />

      <details className="tarjeta resumen-plegable seccion-color naranja">
        <summary>
          <span className="titulo">Resumen de titulares</span>
          <span className="cifras-resumen">
            {totalTitulares} de {totalLugares} lugares
            {sinTurno.length > 0 && (
              <span className="etiqueta faltante">{sinTurno.length} sin turno fijo</span>
            )}
          </span>
        </summary>

        <div className="resumen">
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
            <span className="rotulo">participantes del punto</span>
          </div>
        </div>
      </details>

      <details className="tarjeta plegable">
        <summary>Cómo funciona</summary>
        <p className="tenue">
          Al generar el calendario de un mes, cada titular queda en todas las fechas de su franja.
          Los cambios de aquí no tocan el mes en curso. Si un mes próximo ya estaba generado,
          aparece un aviso arriba para aplicarle los cambios; hasta entonces su rol del mes muestra
          a los titulares anteriores.
        </p>
        <p className="aviso leyenda-capitan" style={{ marginBottom: 0 }}>
          <input type="checkbox" checked readOnly tabIndex={-1} aria-hidden="true" />
          <span>
            La casilla antes de cada nombre marca al <strong>capitán del turno</strong>: solo uno
            por turno. Si marcas a otro, el anterior deja de serlo.
          </span>
        </p>
      </details>

      {bloques.weekly.length > 0 && (
        <div className="tarjeta seccion-color verde" style={{ marginBottom: '1rem' }}>
          <h3>Todas las semanas</h3>
          <p className="tenue">Se repiten cada semana del mes.</p>
          <Rejilla
            slots={bloques.weekly}
            onAgregar={setEligiendo}
            onQuitar={requestRemoval}
            quitando={quitando}
            onCapitan={(id, valor) => void marcarCapitan(id, valor)}
            marcando={marcando}
          />
        </div>
      )}

      {bloques.weeksAvailable.length > 0 && (
        <div className="tarjeta seccion-color azul" style={{ marginBottom: '1rem' }}>
          <h3>Por semana del mes</h3>
          <p className="tenue">El primer sábado puede tener otros titulares que el segundo.</p>
          <div className="segmentado" style={{ margin: '0.6rem 0 0.9rem' }}>
            {bloques.weeksAvailable.map((numero) => (
              <button
                key={numero}
                className={semana === numero ? 'primario' : ''}
                onClick={() => setSemana(numero)}
              >
                {WEEK_ORDINALS[numero] ?? `${numero}.ª`} semana
              </button>
            ))}
          </div>
          <Rejilla
            slots={bloques.byWeekOfMonth.filter((slot) => slot.weekOfMonth === semana)}
            onAgregar={setEligiendo}
            onQuitar={requestRemoval}
            quitando={quitando}
            onCapitan={(id, valor) => void marcarCapitan(id, valor)}
            marcando={marcando}
          />
        </div>
      )}

      {(datos?.slots.length ?? 0) === 0 && (
        <div className="aviso atencion">
          Este punto no tiene franjas horarias configuradas todavía. Defínelas en «Ajustes» antes de
          asignar turnos fijos.
        </div>
      )}

      <details className="tarjeta plegable seccion-color morado">
        <summary>
          Participantes del punto
          <span className="etiqueta">{datos?.padron.length ?? 0}</span>
          {sinTurno.length > 0 && (
            <span className="etiqueta faltante">{sinTurno.length} sin turno fijo</span>
          )}
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
          <p className="tenue">Aún no hay participantes en este punto. Usa la pestaña «Importar».</p>
        )}
      </details>

      {pendingRemoval && (
        <RecurringRemovalDialog
          pending={pendingRemoval}
          busy={quitando !== null}
          error={error}
          onCancel={cancelRemoval}
          onConfirm={() => void quitar(pendingRemoval.recurringId)}
        />
      )}

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
