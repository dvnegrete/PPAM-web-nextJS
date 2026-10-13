'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import type { Participant } from '@/lib/types';
import { MARITAL_LABELS, ORGANIZATION_LABELS, ROLE_LABELS, STATUS_LABELS } from '@/lib/types';
import type {
  OrganizationField,
  OrganizationValues,
  UpdateParticipantResult,
} from '@/lib/types';
import { nombreCompleto, nombreFormal, nombreVisible } from '@/lib/nombres';
import { clave, coincide, digitos, terminos, type Buscable } from '@/lib/texto';
import { EditarParticipante } from './editar-participante';

export function Padron({ locationId }: { locationId: string }) {
  const [participantes, setParticipantes] = useState<Participant[]>([]);
  const [editando, setEditando] = useState<Participant | null>(null);
  const [valores, setValores] = useState<OrganizationValues>({
    congregation: [],
    circuit: [],
    city: [],
  });
  const [filtros, setFiltros] = useState<Record<OrganizationField, string>>({
    congregation: '',
    circuit: '',
    city: '',
  });
  const [busqueda, setBusqueda] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [paterno, setPaterno] = useState('');
  const [materno, setMaterno] = useState('');
  const [comoMostrar, setComoMostrar] = useState('');
  const [telefono, setTelefono] = useState('');
  const [rol, setRol] = useState('participante');
  const [org, setOrg] = useState({ congregation: '', circuit: '', city: '' });

  const cargar = useCallback(async () => {
    setError(null);
    try {
      const [padron, conocidos] = await Promise.all([
        api<Participant[]>(`/locations/${locationId}/participants`),
        api<OrganizationValues>(`/locations/${locationId}/organization-values`),
      ]);
      setParticipantes(padron);
      setValores(conocidos);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'No se pudo cargar el padrón');
    }
  }, [locationId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function agregar(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setAviso(null);
    try {
      await api(`/locations/${locationId}/participants`, {
        method: 'POST',
        body: {
          firstName: nombre,
          paternalSurname: paterno,
          maternalSurname: materno || undefined,
          displayName: comoMostrar || undefined,
          phone: telefono,
          role: rol,
          congregation: org.congregation || undefined,
          circuit: org.circuit || undefined,
          city: org.city || undefined,
        },
      });
      setAviso(`${nombre} ${paterno} quedó registrado.`);
      setNombre('');
      setPaterno('');
      setMaterno('');
      setComoMostrar('');
      setTelefono('');
      setOrg({ congregation: '', circuit: '', city: '' });
      await cargar();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'No se pudo dar de alta');
    }
  }

  /**
   * Lo buscable de cada persona, preparado una sola vez.
   *
   * Normalizar ciento treinta filas en cada tecla sería trabajo tirado: el
   * padrón solo cambia al recargarlo, así que el índice se arma con él.
   *
   * El cónyuge entra por sus **dos** vías —el nombre anotado de quien no
   * participa y el nombre compuesto de quien sí—, porque lo contrario sería que
   * buscar a una pareja funcione solo cuando no está en el padrón.
   */
  const indice = useMemo(() => {
    const mapa = new Map<string, Buscable>();
    for (const p of participantes) {
      mapa.set(p.id, {
        texto: clave(
          [
            p.firstName,
            p.paternalSurname,
            p.maternalSurname,
            p.displayName,
            p.congregation,
            p.spouseName,
            p.spouse ? nombreCompleto(p.spouse) : null,
          ]
            .filter(Boolean)
            .join(' '),
        ),
        digitos: digitos(p.phoneE164),
      });
    }
    return mapa;
  }, [participantes]);

  const terms = useMemo(() => terminos(busqueda), [busqueda]);
  const hayBusqueda = terms.length > 0;
  const hayFiltro = Object.values(filtros).some(Boolean);

  // La búsqueda acota dentro del filtro, no lo sustituye: son dos preguntas
  // distintas y combinarlas es lo que permite «de esta congregación, ¿quién...?».
  const visibles = participantes
    .filter((p) =>
      (Object.keys(filtros) as OrganizationField[]).every(
        (campo) => !filtros[campo] || p[campo] === filtros[campo],
      ),
    )
    .filter((p) => !hayBusqueda || coincide(terms, indice.get(p.id)!));

  const encargados = participantes.filter((p) => p.role !== 'PARTICIPANT').length;
  const sinConsentimiento = participantes.filter((p) => !p.optInAt).length;
  const sinEstadoCivil = participantes.filter((p) => p.maritalStatus === 'SIN_REGISTRAR').length;
  const sinCongregacion = participantes.filter((p) => !p.congregation).length;
  const noActivos = participantes.filter((p) => p.status !== 'ACTIVE').length;

  return (
    <section>
      {error && <div className="aviso error">{error}</div>}
      {aviso && <div className="aviso exito">{aviso}</div>}

      <div className="buscador">
        <label>
          <span className="oculto-visualmente">Buscar en el padrón</span>
          <input
            type="search"
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
            placeholder="Buscar por nombre, apellido, teléfono o congregación"
            autoFocus
          />
        </label>
        {hayBusqueda && (
          <span className="coincidencias" aria-live="polite">
            {visibles.length === 1 ? '1 coincidencia' : `${visibles.length} coincidencias`}
          </span>
        )}
      </div>

      {/* Plegado: el padrón entra por CSV y dar de alta a mano es la excepción.
          Diez campos abiertos empujaban el buscador y la tabla fuera de la vista. */}
      <details className="tarjeta plegable">
        <summary>Dar de alta a alguien nuevo</summary>
        <form onSubmit={agregar} className="forma-alta">
          <label style={{ marginBottom: 0 }}>
            <span>Nombre</span>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ana María"
              required
            />
          </label>
          <label style={{ marginBottom: 0 }}>
            <span>Apellido paterno</span>
            <input value={paterno} onChange={(e) => setPaterno(e.target.value)} required />
          </label>
          <label style={{ marginBottom: 0 }}>
            <span>Apellido materno</span>
            <input
              value={materno}
              onChange={(e) => setMaterno(e.target.value)}
              placeholder="Opcional"
            />
          </label>
          <label style={{ marginBottom: 0 }}>
            <span>Cómo mostrarlo</span>
            <input
              value={comoMostrar}
              onChange={(e) => setComoMostrar(e.target.value)}
              placeholder="Opcional"
            />
          </label>
          <label style={{ marginBottom: 0 }}>
            <span>Teléfono</span>
            <input
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="55 1234 5678"
              required
            />
          </label>
          <label style={{ marginBottom: 0 }}>
            <span>Rol</span>
            <select value={rol} onChange={(e) => setRol(e.target.value)}>
              <option value="participante">Participante</option>
              <option value="encargado">Encargado</option>
            </select>
          </label>
          {(Object.keys(ORGANIZATION_LABELS) as OrganizationField[]).map((campo) => (
            <label key={campo} style={{ marginBottom: 0 }}>
              <span>{ORGANIZATION_LABELS[campo]}</span>
              <input
                value={org[campo]}
                onChange={(e) => setOrg({ ...org, [campo]: e.target.value })}
                list={`alta-${campo}`}
                placeholder="Opcional"
              />
              <datalist id={`alta-${campo}`}>
                {valores[campo]?.map((valor) => (
                  <option key={valor} value={valor} />
                ))}
              </datalist>
            </label>
          ))}
          <button className="primario" type="submit">Agregar</button>
        </form>
      </details>

      {/* Los contadores son del padrón entero: dicen qué falta por capturar, y
          eso no cambia porque se esté buscando a alguien. */}
      <p className="tenue">
        {participantes.length} registrado(s) · {encargados} encargado(s)
        {noActivos > 0 && ` · ${noActivos} pausado(s) o de baja`}
        {sinConsentimiento > 0 && ` · ${sinConsentimiento} sin primer contacto`}
        {sinEstadoCivil > 0 && ` · ${sinEstadoCivil} sin estado civil`}
        {sinCongregacion > 0 && ` · ${sinCongregacion} sin congregación`}
      </p>

      <details className="tarjeta plegable">
        <summary>
          Filtros
          {hayFiltro && (
            <span className="etiqueta completo">
              {Object.values(filtros).filter(Boolean).join(' · ')}
            </span>
          )}
        </summary>
        <div className="filtros-padron">
        {(Object.keys(ORGANIZATION_LABELS) as OrganizationField[]).map((campo) => (
          <label key={campo} style={{ marginBottom: 0 }}>
            <span>{ORGANIZATION_LABELS[campo]}</span>
            <select
              value={filtros[campo]}
              onChange={(evento) => setFiltros({ ...filtros, [campo]: evento.target.value })}
            >
              <option value="">Todas</option>
              {valores[campo]?.map((valor) => (
                <option key={valor} value={valor}>
                  {valor}
                </option>
              ))}
            </select>
          </label>
        ))}
          <button
            onClick={() => setFiltros({ congregation: '', circuit: '', city: '' })}
            disabled={!hayFiltro}
          >
            Quitar filtros
          </button>
        </div>
      </details>

      <div className="tarjeta">
        <table className="padron-tabla">
          <thead>
            <tr>
              <th>Nombre</th>
              <th className="secundaria">Se muestra como</th>
              <th>Teléfono</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Congregación</th>
              <th className="secundaria">Circuito</th>
              <th className="secundaria">Ciudad</th>
              <th className="secundaria">Estado civil</th>
              <th className="secundaria">Cónyuge</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((p) => (
              <tr key={p.id}>
                <td>{nombreFormal(p)}</td>
                <td className="secundaria">
                  {p.displayName ? (
                    p.displayName
                  ) : (
                    <span className="tenue">{nombreVisible(p)}</span>
                  )}
                </td>
                <td style={{ fontVariantNumeric: 'tabular-nums' }}>{p.phoneE164}</td>
                <td>
                  {p.role === 'PARTICIPANT' ? (
                    ROLE_LABELS[p.role]
                  ) : (
                    <span className="etiqueta completo">{ROLE_LABELS[p.role]}</span>
                  )}
                </td>
                <td>
                  {p.status === 'ACTIVE' ? (
                    <span className="tenue">{STATUS_LABELS[p.status]}</span>
                  ) : (
                    <span
                      className={`etiqueta ${p.status === 'PAUSED' ? 'faltante' : 'critico'}`}
                    >
                      {STATUS_LABELS[p.status]}
                    </span>
                  )}
                </td>
                <td>{p.congregation ?? <span className="tenue">—</span>}</td>
                <td className="secundaria">{p.circuit ?? <span className="tenue">—</span>}</td>
                <td className="secundaria">{p.city ?? <span className="tenue">—</span>}</td>
                <td className="secundaria">
                  {p.maritalStatus === 'SIN_REGISTRAR' ? (
                    <span className="tenue">Sin registrar</span>
                  ) : (
                    MARITAL_LABELS[p.maritalStatus]
                  )}
                </td>
                <td className="secundaria">
                  {p.spouse ? (
                    <>
                      {nombreVisible(p.spouse)}
                      <span className="tenue"> · participa</span>
                    </>
                  ) : p.spouseName ? (
                    <>
                      {p.spouseName}
                      <span className="tenue"> · no participa</span>
                    </>
                  ) : (
                    <span className="tenue">—</span>
                  )}
                </td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <button className="accion" onClick={() => setEditando(p)}>
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
      </div>

      {editando && (
        <EditarParticipante
          locationId={locationId}
          participante={editando}
          valores={valores}
          onGuardado={async (resultado) => {
            await cargar();
            setAviso(resumenDeGuardado(resultado));
          }}
          onCerrar={() => setEditando(null)}
        />
      )}
    </section>
  );
}

/**
 * Qué contar después de guardar.
 *
 * Los turnos liberados y los mensajes descartados no se ven en la tabla, así que
 * si no se dicen aquí el administrador no se enteraría de que ocurrieron.
 */
function resumenDeGuardado(resultado: UpdateParticipantResult): string {
  const partes = [`${nombreVisible(resultado)}: cambios guardados.`];
  if (resultado.cancelledShifts > 0) {
    partes.push(
      resultado.cancelledShifts === 1
        ? 'Se liberó 1 turno futuro, sin convocar a nadie.'
        : `Se liberaron ${resultado.cancelledShifts} turnos futuros, sin convocar a nadie.`,
    );
  }
  partes.push(...resultado.warnings);
  return partes.join(' ');
}
