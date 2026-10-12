'use client';

import { useState } from 'react';
import type { CalendarShift } from '@/lib/types';

interface Props {
  mes: string;
  shifts: CalendarShift[];
  onConfirmar: () => Promise<void>;
  onCerrar: () => void;
}

/**
 * Advertencia antes de volver a generar un mes ya publicado.
 *
 * Regenerar no es una operación destructiva —no borra turnos ni deshace bajas—
 * pero tampoco es neutra, y lo que hace no se adivina desde el botón: completa
 * huecos con los titulares de hoy, puede crear turnos si las franjas del punto
 * cambiaron, y **no avisa a nadie** de que quedó sentado en un turno.
 *
 * Lo que se afirma aquí está comprobado con pruebas de integración, no supuesto:
 * cada punto de la lista tiene su caso en `scheduling.int-spec.ts`.
 */
export function RegenerarDialogo({ mes, shifts, onConfirmar, onCerrar }: Props) {
  const [ocupado, setOcupado] = useState(false);

  const hoy = new Date().toISOString().slice(0, 10);
  const futuros = shifts.filter((s) => s.date >= hoy && s.status !== 'CANCELLED');
  const conHueco = futuros.filter((s) => s.occupied < s.capacity).length;
  const pasados = shifts.filter((s) => s.date < hoy).length;
  const cancelados = shifts.filter((s) => s.status === 'CANCELLED').length;

  async function confirmar() {
    setOcupado(true);
    try {
      await onConfirmar();
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="telon" role="dialog" aria-modal="true" aria-label="Volver a generar el mes">
      <div className="dialogo dialogo-ancho">
        <h3>Volver a generar {mes}</h3>
        <p className="tenue">
          Este mes ya está publicado, con {shifts.length} turno(s). Regenerar no borra nada, pero
          conviene saber qué sí cambia y qué no.
        </p>

        <div className="aviso atencion" style={{ marginBottom: '0.9rem' }}>
          <strong>Nadie recibe aviso.</strong> Quien quede sentado en un turno no se enterará por
          este proceso: lo sabrá cuando le llegue el recordatorio del turno, que puede ser con poca
          antelación si el turno es de los próximos días.
        </div>

        <h4 style={{ margin: '0 0 0.3rem', fontSize: '0.92rem' }}>Qué va a hacer</h4>
        <ul className="consecuencias">
          <li>
            <span className="marca suma">+</span>
            Sentar a los titulares fijos que falten en los{' '}
            <strong>{conHueco} turno(s) futuro(s) con hueco</strong>, hasta llenar su cupo.
          </li>
          <li>
            <span className="marca suma">+</span>
            Crear los turnos que falten. Si agregaste franjas horarias al punto después de publicar
            el mes, <strong>aparecerán turnos nuevos</strong>, incluidos los de días que ya pasaron.
          </li>
        </ul>

        <h4 style={{ margin: '0.8rem 0 0.3rem', fontSize: '0.92rem' }}>Qué no va a tocar</h4>
        <ul className="consecuencias">
          <li>
            <span className="marca igual">=</span>
            Las <strong>bajas</strong>: quien canceló un día concreto no vuelve a quedar sentado, y
            el hueco sigue siendo un hueco.
          </li>
          <li>
            <span className="marca igual">=</span>
            Quien ya está sentado, venga de su turno fijo o de una cobertura. No se duplica ni se
            mueve a nadie.
          </li>
          <li>
            <span className="marca igual">=</span>
            Los <strong>{pasados} turno(s) ya pasados</strong> de este mes
            {cancelados > 0 && <> y los {cancelados} cancelado(s)</>}: no se repueblan.
          </li>
        </ul>

        <h4 style={{ margin: '0.8rem 0 0.3rem', fontSize: '0.92rem' }}>
          Lo que esto <em>no</em> resuelve
        </h4>
        <ul className="consecuencias">
          <li>
            <span className="marca resta">!</span>
            Regenerar <strong>solo añade</strong>. Si le quitaste el turno fijo a alguien, seguirá
            sentado en los turnos ya publicados: hay que quitarlo turno por turno desde el Tablero.
          </li>
          <li>
            <span className="marca resta">!</span>
            Un <strong>cambio de cupo</strong> en la franja no se aplica a los turnos ya creados:
            conservan el cupo que tenían al publicarse.
          </li>
        </ul>

        <div className="dialogo-acciones">
          <button onClick={onCerrar} disabled={ocupado}>
            Cancelar
          </button>
          <button className="primario" onClick={() => void confirmar()} disabled={ocupado}>
            {ocupado ? 'Generando…' : 'Entiendo, volver a generar'}
          </button>
        </div>
      </div>
    </div>
  );
}
