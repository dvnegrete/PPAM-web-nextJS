'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { errorMessage } from '@/lib/errors';
import { nombreVisible } from '@/lib/nombres';
import {
  buildSearchIndex,
  directoryCounts,
  filterParticipants,
  NO_FILTERS,
  saveSummary,
  type OrganizationFilters,
} from '@/lib/participant-directory';
import {
  createParticipant,
  fetchOrganizationValues,
  fetchParticipants,
  type NewParticipant,
} from '@/lib/services/participants';
import { terminos } from '@/lib/texto';
import type { OrganizationValues, Participant } from '@/lib/types';
import { EditarParticipante } from './editar-participante';
import { ParticipantCards } from './participant-cards';
import { ParticipantCreateForm } from './participant-create-form';
import { ParticipantFilters } from './participant-filters';
import { ParticipantsTable } from './participants-table';
import { TurnosDeParticipante } from './turnos-de-participante';

export function Padron({ locationId }: { locationId: string }) {
  const [participantes, setParticipantes] = useState<Participant[]>([]);
  const [editando, setEditando] = useState<Participant | null>(null);
  const [viendoTurnos, setViendoTurnos] = useState<Participant | null>(null);
  const [valores, setValores] = useState<OrganizationValues>({
    congregation: [],
    circuit: [],
    city: [],
  });
  const [filtros, setFiltros] = useState<OrganizationFilters>(NO_FILTERS);
  const [busqueda, setBusqueda] = useState('');
  // En el teléfono la lista no se pinta hasta que se busca o se pide.
  const [verTodos, setVerTodos] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      const [padron, conocidos] = await Promise.all([
        fetchParticipants(locationId),
        fetchOrganizationValues(locationId),
      ]);
      setParticipantes(padron);
      setValores(conocidos);
    } catch (problem) {
      setError(errorMessage(problem, 'No se pudieron cargar los participantes'));
    }
  }, [locationId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function agregar(participant: NewParticipant): Promise<boolean> {
    setError(null);
    setAviso(null);
    try {
      await createParticipant(locationId, participant);
      setAviso(`${participant.firstName} ${participant.paternalSurname} quedó registrado.`);
      void cargar();
      return true;
    } catch (problem) {
      setError(errorMessage(problem, 'No se pudo dar de alta'));
      return false;
    }
  }

  const indice = useMemo(() => buildSearchIndex(participantes), [participantes]);
  const terms = useMemo(() => terminos(busqueda), [busqueda]);
  const hayBusqueda = terms.length > 0;
  const hayFiltro = Object.values(filtros).some(Boolean);

  const visibles = filterParticipants(participantes, filtros, terms, indice);
  const counts = directoryCounts(participantes);

  const listaAbierta = hayBusqueda || hayFiltro || verTodos;

  const sinResultados = (
    <>
      {participantes.length === 0 && (
        <p className="tenue">Aún no hay nadie registrado. Usa la pestaña «Importar».</p>
      )}
      {participantes.length > 0 && visibles.length === 0 && (
        <p className="tenue">
          {hayBusqueda && hayFiltro
            ? 'Nadie coincide con la búsqueda dentro del filtro aplicado.'
            : hayBusqueda
              ? `Nadie coincide con «${busqueda.trim()}».`
              : 'Nadie coincide con el filtro aplicado.'}
        </p>
      )}
    </>
  );

  return (
    <section>
      {error && <div className="aviso error">{error}</div>}
      {aviso && <div className="aviso exito">{aviso}</div>}

      <div className="buscador buscador-destacado">
        <label>
          <span className="oculto-visualmente">Buscar participantes</span>
          <svg
            className="buscador-lupa"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            type="search"
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
            placeholder="Buscar por nombre, teléfono o congregación"
            autoFocus
          />
        </label>
        {hayBusqueda && (
          <span className="coincidencias" aria-live="polite">
            {visibles.length === 1 ? '1 coincidencia' : `${visibles.length} coincidencias`}
          </span>
        )}
      </div>

      <ParticipantCreateForm knownValues={valores} onCreate={agregar} />

      {/* Los contadores son del padrón entero: dicen qué falta por capturar, y
          eso no cambia porque se esté buscando a alguien. */}
      <p className="tenue">
        {counts.total} registrado(s) · {counts.supervisors} encargado(s)
        {counts.notActive > 0 && ` · ${counts.notActive} pausado(s) o de baja`}
        {counts.withoutOptIn > 0 && ` · ${counts.withoutOptIn} sin primer contacto`}
        {counts.withoutMaritalStatus > 0 && ` · ${counts.withoutMaritalStatus} sin estado civil`}
        {counts.withoutCongregation > 0 && ` · ${counts.withoutCongregation} sin congregación`}
      </p>

      <ParticipantFilters filters={filtros} knownValues={valores} onChange={setFiltros} />

      <ParticipantsTable
        participants={visibles}
        emptyState={sinResultados}
        onShowShifts={setViendoTurnos}
        onEdit={setEditando}
      />

      <ParticipantCards
        participants={visibles}
        emptyState={sinResultados}
        onShowShifts={setViendoTurnos}
        onEdit={setEditando}
        total={participantes.length}
        open={listaAbierta}
        canHide={verTodos && !hayBusqueda && !hayFiltro}
        onShowAll={setVerTodos}
      />

      {viendoTurnos && (
        <TurnosDeParticipante
          locationId={locationId}
          participanteId={viendoTurnos.id}
          nombre={nombreVisible(viendoTurnos)}
          status={viendoTurnos.status}
          onChanged={() => void cargar()}
          onCerrar={() => setViendoTurnos(null)}
        />
      )}

      {editando && (
        <EditarParticipante
          locationId={locationId}
          participante={editando}
          valores={valores}
          onGuardado={async (resultado) => {
            await cargar();
            setAviso(saveSummary(resultado));
          }}
          onCerrar={() => setEditando(null)}
        />
      )}
    </section>
  );
}
