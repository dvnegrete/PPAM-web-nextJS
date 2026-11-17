'use client';

import { useState } from 'react';
import { WEEKDAY_ABBREVIATIONS, WEEKDAY_TITLES } from '@/lib/calendar-labels';
import { rango12h } from '@/lib/horas';
import { capacityClass } from '@/lib/recurring-slots';
import type { RecurringSlot } from '@/lib/types';

/** La rejilla de franjas: filas por horario, columnas por día. */
export function Rejilla({
  slots,
  onAgregar,
  onQuitar,
  quitando,
  onCapitan,
  marcando,
}: {
  slots: RecurringSlot[];
  onAgregar: (slot: RecurringSlot) => void;
  onQuitar: (recurringId: string) => void;
  quitando: string | null;
  onCapitan: (recurringId: string, isCaptain: boolean) => void;
  marcando: string | null;
}) {
  // Los días se ordenan empezando en lunes: es cómo se lee un horario, aunque en
  // la base el domingo sea el día 0.
  const dias = [...new Set(slots.map((slot) => slot.weekday))].sort(
    (a, b) => ((a + 6) % 7) - ((b + 6) % 7),
  );
  const franjas = [
    ...new Map(
      slots.map((slot) => [slot.startMinute, rango12h(slot.startMinute, slot.endMinute)]),
    ).entries(),
  ].sort((a, b) => a[0] - b[0]);

  if (slots.length === 0) {
    return <p className="tenue">No hay franjas configuradas para esta semana.</p>;
  }

  return (
    <>
      <DayList
        slots={slots}
        days={dias}
        onAgregar={onAgregar}
        onQuitar={onQuitar}
        quitando={quitando}
        onCapitan={onCapitan}
        marcando={marcando}
      />
      <div className="rejilla-fijos-envoltura fixed-grid-wide">
      <table className="rejilla-fijos">
        <thead>
          <tr>
            <th style={{ width: '10.5rem' }}>Horario</th>
            {dias.map((dia) => (
              <th key={dia}>
                <abbr title={WEEKDAY_TITLES[dia]}>{WEEKDAY_ABBREVIATIONS[dia]}</abbr>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {franjas.map(([startMinute, range]) => (
            <tr key={startMinute}>
              <th scope="row" className="franja">{range}</th>
              {dias.map((dia) => {
                const slot = slots.find(
                  (item) => item.weekday === dia && item.startMinute === startMinute,
                );
                if (!slot) {
                  return (
                    <td key={dia} className="celda-fija sin-franja">
                      <span className="tenue">—</span>
                    </td>
                  );
                }
                return (
                  <td key={dia} className="celda-fija">
                    <SlotHolders
                      slot={slot}
                      label={`${WEEKDAY_TITLES[dia]} ${range}`}
                      onAgregar={onAgregar}
                      onQuitar={onQuitar}
                      quitando={quitando}
                      onCapitan={onCapitan}
                      marcando={marcando}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </>
  );
}

interface SlotActions {
  onAgregar: (slot: RecurringSlot) => void;
  onQuitar: (recurringId: string) => void;
  quitando: string | null;
  onCapitan: (recurringId: string, isCaptain: boolean) => void;
  marcando: string | null;
}

/**
 * Los titulares de una franja, con sus controles. Es el mismo contenido en la
 * rejilla ancha y en la lista por día, para que editar sea igual en ambas.
 */
function SlotHolders({
  slot,
  label,
  showCapacity = true,
  onAgregar,
  onQuitar,
  quitando,
  onCapitan,
  marcando,
}: SlotActions & { slot: RecurringSlot; label: string; showCapacity?: boolean }) {
  return (
    <>
      {showCapacity && (
        <div className="cupo">
          <span className={`etiqueta ${capacityClass(slot)}`}>
            {slot.holders.length}/{slot.capacity}
          </span>
        </div>
      )}
      <ul className="titulares">
        {slot.holders.map((titular) => (
          <li key={titular.recurringId}>
            <label
              className={`capitan ${titular.isCaptain ? 'activo' : ''}`}
              title={titular.isCaptain ? 'Capitán del turno' : 'Marcar como capitán'}
            >
              <input
                type="checkbox"
                checked={titular.isCaptain}
                disabled={marcando !== null}
                onChange={(evento) => onCapitan(titular.recurringId, evento.target.checked)}
                aria-label={`${titular.name} es capitán de ${label}`}
              />
            </label>
            <span className="nombre">
              {titular.name}
              {titular.isCaptain && <span className="insignia-capitan">Capitán</span>}
            </span>
            <button
              className="quitar"
              onClick={() => onQuitar(titular.recurringId)}
              disabled={quitando === titular.recurringId}
              aria-label={`Quitar a ${titular.name} de ${label}`}
              title={`Quitar a ${titular.name}`}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      {slot.freeSlots > 0 && (
        <button
          className="agregar-titular"
          onClick={() => onAgregar(slot)}
          aria-label={`Agregar titular a ${label}`}
        >
          + Agregar
        </button>
      )}
    </>
  );
}

/**
 * La misma rejilla para pantallas angostas: se elige un día y sus franjas van
 * una debajo de otra. Cinco columnas con tres nombres cada una no caben sin
 * desplazarse de lado; un día a la vez, sí.
 */
function DayList({
  slots,
  days,
  ...actions
}: SlotActions & { slots: RecurringSlot[]; days: number[] }) {
  const [selectedDay, setSelectedDay] = useState(days[0]);
  // Al cambiar de semana pueden cambiar los días disponibles.
  const activeDay = days.includes(selectedDay) ? selectedDay : days[0];
  const daySlots = slots
    .filter((slot) => slot.weekday === activeDay)
    .sort((a, b) => a.startMinute - b.startMinute);

  return (
    <div className="fixed-day-list">
      <div className="fixed-day-tabs" role="tablist" aria-label="Día">
        {days.map((day) => {
          const ofDay = slots.filter((slot) => slot.weekday === day);
          const free = ofDay.reduce((sum, slot) => sum + slot.freeSlots, 0);
          return (
            <button
              key={day}
              role="tab"
              aria-selected={day === activeDay}
              className={day === activeDay ? 'primario' : ''}
              onClick={() => setSelectedDay(day)}
            >
              {WEEKDAY_ABBREVIATIONS[day]}
              {free > 0 && <span className="fixed-day-free">{free}</span>}
            </button>
          );
        })}
      </div>

      <p className="tenue fixed-day-title">
        {WEEKDAY_TITLES[activeDay]}
        {' · '}
        {daySlots.reduce((sum, slot) => sum + slot.freeSlots, 0) === 0
          ? 'todos los lugares con titular'
          : 'el número indica lugares sin titular'}
      </p>

      <ul className="fixed-slots">
        {daySlots.map((slot) => {
          const range = rango12h(slot.startMinute, slot.endMinute);
          return (
            <li key={slot.templateId} className={`fixed-slot celda-fija ${capacityClass(slot)}`}>
              <div className="fixed-slot-header">
                <strong>{range}</strong>
                <span className={`etiqueta ${capacityClass(slot)}`}>
                  {slot.holders.length}/{slot.capacity}
                </span>
              </div>
              <SlotHolders
                slot={slot}
                label={`${WEEKDAY_TITLES[activeDay]} ${range}`}
                showCapacity={false}
                {...actions}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
