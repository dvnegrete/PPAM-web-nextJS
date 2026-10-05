'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Participant } from '@/lib/types';
import { MARITAL_LABELS, ORGANIZATION_LABELS } from '@/lib/types';
import type { OrganizationField, OrganizationValues } from '@/lib/types';
import { nombreFormal, nombreVisible } from '@/lib/nombres';
import { EstadoCivilDialogo } from './estado-civil-dialogo';
import { OrganizacionDialogo } from './organizacion-dialogo';

const ROLES: Record<Participant['role'], string> = {
  PARTICIPANT: 'Participante',
  SUPERVISOR: 'Encargado',
  ADMIN: 'Administrador',
};

export function Padron({ locationId }: { locationId: string }) {
  const [participantes, setParticipantes] = useState<Participant[]>([]);
  const [editando, setEditando] = useState<Participant | null>(null);
  const [editandoOrg, setEditandoOrg] = useState<Participant | null>(null);
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

  const visibles = participantes.filter((p) =>
    (Object.keys(filtros) as OrganizationField[]).every(
      (campo) => !filtros[campo] || p[campo] === filtros[campo],
    ),
  );
  const hayFiltro = Object.values(filtros).some(Boolean);

  const encargados = participantes.filter((p) => p.role !== 'PARTICIPANT').length;
  const sinConsentimiento = participantes.filter((p) => !p.optInAt).length;
  const sinEstadoCivil = participantes.filter((p) => p.maritalStatus === 'SIN_REGISTRAR').length;
  const sinCongregacion = participantes.filter((p) => !p.congregation).length;

  return (
    <section>
      {error && <div className="aviso error">{error}</div>}
      {aviso && <div className="aviso exito">{aviso}</div>}

      <div className="tarjeta" style={{ marginBottom: '1rem' }}>
        <h3>Dar de alta</h3>
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
      </div>

      <p className="tenue">
        {participantes.length} registrado(s) · {encargados} encargado(s)
        {sinConsentimiento > 0 && ` · ${sinConsentimiento} sin primer contacto`}
        {sinEstadoCivil > 0 && ` · ${sinEstadoCivil} sin estado civil`}
        {sinCongregacion > 0 && ` · ${sinCongregacion} sin congregación`}
        {hayFiltro && ` · ${visibles.length} con el filtro aplicado`}
      </p>

      <div className="tarjeta filtros-padron">
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

      <div className="tarjeta">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Se muestra como</th>
              <th>Teléfono</th>
              <th>Rol</th>
              <th>Congregación</th>
              <th>Circuito</th>
              <th>Ciudad</th>
              <th>Estado civil</th>
              <th>Cónyuge</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((p) => (
              <tr key={p.id}>
                <td>{nombreFormal(p)}</td>
                <td>
                  {p.displayName ? (
                    p.displayName
                  ) : (
                    <span className="tenue">{nombreVisible(p)}</span>
                  )}
                </td>
                <td style={{ fontVariantNumeric: 'tabular-nums' }}>{p.phoneE164}</td>
                <td>
                  {p.role === 'PARTICIPANT' ? (
                    ROLES[p.role]
                  ) : (
                    <span className="etiqueta completo">{ROLES[p.role]}</span>
                  )}
                </td>
                <td>{p.congregation ?? <span className="tenue">—</span>}</td>
                <td>{p.circuit ?? <span className="tenue">—</span>}</td>
                <td>{p.city ?? <span className="tenue">—</span>}</td>
                <td>
                  {p.maritalStatus === 'SIN_REGISTRAR' ? (
                    <span className="tenue">Sin registrar</span>
                  ) : (
                    MARITAL_LABELS[p.maritalStatus]
                  )}
                </td>
                <td>
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
                  <button className="accion" onClick={() => setEditandoOrg(p)}>
                    Congregación
                  </button>{' '}
                  <button className="accion" onClick={() => setEditando(p)}>
                    Estado civil
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
          <p className="tenue">Nadie coincide con el filtro aplicado.</p>
        )}
      </div>

      {editandoOrg && (
        <OrganizacionDialogo
          participante={editandoOrg}
          valores={valores}
          onGuardado={cargar}
          onCerrar={() => setEditandoOrg(null)}
        />
      )}

      {editando && (
        <EstadoCivilDialogo
          locationId={locationId}
          participante={editando}
          onGuardado={cargar}
          onCerrar={() => setEditando(null)}
        />
      )}
    </section>
  );
}
