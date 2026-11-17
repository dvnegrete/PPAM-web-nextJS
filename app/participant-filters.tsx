'use client';

import { NO_FILTERS, type OrganizationFilters } from '@/lib/participant-directory';
import { ORGANIZATION_LABELS } from '@/lib/types';
import type { OrganizationField, OrganizationValues } from '@/lib/types';

interface Props {
  filters: OrganizationFilters;
  knownValues: OrganizationValues;
  onChange: (filters: OrganizationFilters) => void;
}

/** Filtros por congregación, circuito y ciudad. */
export function ParticipantFilters({ filters, knownValues, onChange }: Props) {
  const hasFilter = Object.values(filters).some(Boolean);

  return (
    <details className="tarjeta plegable">
      <summary>
        Filtros
        {hasFilter && (
          <span className="etiqueta completo">
            {Object.values(filters).filter(Boolean).join(' · ')}
          </span>
        )}
      </summary>
      <div className="filters-padron">
        {(Object.keys(ORGANIZATION_LABELS) as OrganizationField[]).map((campo) => (
          <label key={campo} style={{ marginBottom: 0 }}>
            <span>{ORGANIZATION_LABELS[campo]}</span>
            <select
              value={filters[campo]}
              onChange={(evento) => onChange({ ...filters, [campo]: evento.target.value })}
            >
              <option value="">Todas</option>
              {knownValues[campo]?.map((valor) => (
                <option key={valor} value={valor}>
                  {valor}
                </option>
              ))}
            </select>
          </label>
        ))}
        <button onClick={() => onChange(NO_FILTERS)} disabled={!hasFilter}>
          Quitar filters
        </button>
      </div>
    </details>
  );
}
