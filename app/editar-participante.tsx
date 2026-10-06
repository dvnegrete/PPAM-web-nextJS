'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { nombreCompleto, nombreFormal } from '@/lib/nombres';
import {
  MARITAL_LABELS,
  ORGANIZATION_LABELS,
  ROLE_LABELS,
  ROLE_VALUES,
  STATUS_LABELS,
} from '@/lib/types';
import type {
  MaritalStatus,
  OrganizationField,
  OrganizationValues,
  Participant,
  ParticipantRole,
  ParticipantStatus,
  SpouseCandidate,
  UpdateParticipantResult,
} from '@/lib/types';

/** Cómo se registra al cónyuge: con referencia al padrón o solo su nombre. */
type Modo = 'participante' | 'externo';

const CAMPOS_ORG: OrganizationField[] = ['congregation', 'circuit', 'city'];
const ROLES: ParticipantRole[] = ['PARTICIPANT', 'SUPERVISOR', 'ADMIN'];
const ESTADOS: ParticipantStatus[] = ['ACTIVE', 'PAUSED', 'INACTIVE'];

interface Props {
  locationId: string;
  participante: Participant;
  /** Valores ya registrados de organización, para sugerirlos al escribir. */
  valores: OrganizationValues;
  onGuardado: (resultado: UpdateParticipantResult) => Promise<void> | void;
  onCerrar: () => void;
}

/**
 * Edición completa de un participante.
 *
 * Un solo diálogo y un solo guardado: antes había que abrir dos pantallas para
 * corregir a una persona, y el nombre, el teléfono, el rol y el estado no se
 * podían tocar por ninguna vía.
 *
 * Los dos cambios con consecuencias —el teléfono y la baja— piden confirmación
 * explícita, porque no se notan al mirar la tabla: uno descarta los mensajes que
 * estaban por salir y el otro libera turnos ya publicados.
 */
export function EditarParticipante({
  locationId,
  participante,
  valores,
  onGuardado,
  onCerrar,
}: Props) {
  const [nombre, setNombre] = useState(participante.firstName);
  const [paterno, setPaterno] = useState(participante.paternalSurname);
  const [materno, setMaterno] = useState(participante.maternalSurname ?? '');
  const [comoMostrar, setComoMostrar] = useState(participante.displayName ?? '');
  const [telefono, setTelefono] = useState(participante.phoneE164);

  const [rol, setRol] = useState<ParticipantRole>(participante.role);
  const [alertas, setAlertas] = useState(participante.coverageAlerts);
  const [estado, setEstado] = useState<ParticipantStatus>(participante.status);

  const [org, setOrg] = useState({
    congregation: participante.congregation ?? '',
    circuit: participante.circuit ?? '',
    city: participante.city ?? '',
  });

  const [civil, setCivil] = useState<MaritalStatus>(participante.maritalStatus);
  const [modo, setModo] = useState<Modo>(participante.spouseName ? 'externo' : 'participante');
  const [conyugeId, setConyugeId] = useState(participante.spouse?.id ?? '');
  const [conyugeNombre, setConyugeNombre] = useState(participante.spouseName ?? '');
  const [candidatos, setCandidatos] = useState<SpouseCandidate[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const casado = civil === 'CASADO';
  const cambiaTelefono = telefono.trim() !== participante.phoneE164;
  const seDaDeBaja = estado !== 'ACTIVE' && participante.status === 'ACTIVE';

  useEffect(() => {
    if (!casado) return;
    let vigente = true;
    api<SpouseCandidate[]>(
      `/locations/${locationId}/participants/${participante.id}/spouse-candidates`,
    )
      .then((lista) => {
        if (vigente) setCandidatos(lista);
      })
      .catch((problema: unknown) => {
        if (vigente) {
          setError(problema instanceof Error ? problema.message : 'No se pudo cargar el padrón');
        }
      });
    return () => {
      vigente = false;
    };
  }, [casado, locationId, participante.id]);

  async function guardar() {
    if (cambiaTelefono) {
      const sigue = window.confirm(
        `Vas a cambiar el teléfono de ${nombreCompleto(participante)}.\n\n` +
          'Los mensajes que estuvieran por salir al número anterior se descartan y se volverán a ' +
          'generar con el nuevo. El historial, los turnos y el consentimiento no se tocan.',
      );
      if (!sigue) return;
    }

    if (seDaDeBaja) {
      const sigue = window.confirm(
        `Vas a marcar a ${nombreCompleto(participante)} como ` +
          `«${STATUS_LABELS[estado].toLowerCase()}».\n\n` +
          'Sus turnos futuros ya asignados se van a liberar, y NO se convocará a nadie: los huecos ' +
          'quedarán visibles en el Tablero para que decidas cuándo pedir cobertura.\n\n' +
          'Los turnos que ya atendió no se tocan.',
      );
      if (!sigue) return;
    }

    setOcupado(true);
    setError(null);
    try {
      const resultado = await api<UpdateParticipantResult>(
        `/locations/${locationId}/participants/${participante.id}`,
        {
          method: 'PATCH',
          body: {
            firstName: nombre.trim(),
            paternalSurname: paterno.trim(),
            maternalSurname: materno.trim() || null,
            displayName: comoMostrar.trim() || null,
            // Solo se manda si cambió: así el servidor no marca una fecha de
            // cambio de número por haber guardado otra cosa.
            ...(cambiaTelefono ? { phone: telefono.trim() } : {}),
            role: ROLE_VALUES[rol],
            coverageAlerts: alertas,
            status: estado,
            congregation: org.congregation.trim() || null,
            circuit: org.circuit.trim() || null,
            city: org.city.trim() || null,
            maritalStatus: civil,
            spouseParticipantId: casado && modo === 'participante' ? conyugeId || null : null,
            spouseName: casado && modo === 'externo' ? conyugeNombre.trim() || null : null,
          },
        },
      );
      await onGuardado(resultado);
      onCerrar();
    } catch (problema) {
      setError(problema instanceof Error ? problema.message : 'No se pudo guardar');
      setOcupado(false);
    }
  }

  return (
    <div className="telon" role="dialog" aria-modal="true" aria-label="Editar participante">
      <div className="dialogo dialogo-ancho">
        <h3>Editar participante</h3>
        <p className="tenue">{nombreCompleto(participante)}</p>

        {error && <div className="aviso error">{error}</div>}

        <fieldset className="grupo">
          <legend>Identificación</legend>
          <div className="campos-par">
            <label>
              <span>Nombre</span>
              <input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
            </label>
            <label>
              <span>Apellido paterno</span>
              <input value={paterno} onChange={(e) => setPaterno(e.target.value)} required />
            </label>
            <label>
              <span>Apellido materno</span>
              <input
                value={materno}
                onChange={(e) => setMaterno(e.target.value)}
                placeholder="Opcional"
              />
            </label>
            <label>
              <span>Se muestra como</span>
              <input
                value={comoMostrar}
                onChange={(e) => setComoMostrar(e.target.value)}
                placeholder="Su nombre de pila"
              />
            </label>
          </div>
          <label>
            <span>Teléfono</span>
            <input
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              style={{ fontVariantNumeric: 'tabular-nums' }}
            />
            <span className="tenue" style={{ marginTop: '0.2rem' }}>
              {cambiaTelefono
                ? 'Al guardar se pedirá confirmación: es la identidad de la persona en WhatsApp.'
                : 'Con o sin lada y con espacios: se normaliza al guardar.'}
            </span>
          </label>
        </fieldset>

        <fieldset className="grupo">
          <legend>En este punto</legend>
          <div className="campos-par">
            <label>
              <span>Rol</span>
              <select value={rol} onChange={(e) => setRol(e.target.value as ParticipantRole)}>
                {ROLES.map((clave) => (
                  <option key={clave} value={clave}>
                    {ROLE_LABELS[clave]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Estado</span>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value as ParticipantStatus)}
              >
                {ESTADOS.map((clave) => (
                  <option key={clave} value={clave}>
                    {STATUS_LABELS[clave]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="casilla">
            <input
              type="checkbox"
              checked={alertas}
              onChange={(e) => setAlertas(e.target.checked)}
            />
            <span>Recibe avisos cuando hay que cubrir un turno de este punto</span>
          </label>
          {seDaDeBaja && (
            <div className="aviso atencion" style={{ marginBottom: 0 }}>
              Al guardar se liberarán sus turnos futuros sin convocar a nadie.
            </div>
          )}
        </fieldset>

        <fieldset className="grupo">
          <legend>Organización</legend>
          <div className="campos-par">
            {CAMPOS_ORG.map((campo) => (
              <label key={campo}>
                <span>{ORGANIZATION_LABELS[campo]}</span>
                <input
                  value={org[campo]}
                  onChange={(e) => setOrg({ ...org, [campo]: e.target.value })}
                  list={`edit-sugerencias-${campo}`}
                  placeholder="Opcional"
                />
                <datalist id={`edit-sugerencias-${campo}`}>
                  {valores[campo]?.map((valor) => (
                    <option key={valor} value={valor} />
                  ))}
                </datalist>
              </label>
            ))}
          </div>
          <span className="tenue">
            Si escribes algo equivalente a un valor ya registrado, se guarda con la escritura que ya
            existía, para que los reportes no se dividan.
          </span>
        </fieldset>

        <fieldset className="grupo">
          <legend>Estado civil</legend>
          <label>
            <span>Estado</span>
            <select value={civil} onChange={(e) => setCivil(e.target.value as MaritalStatus)}>
              {(Object.keys(MARITAL_LABELS) as MaritalStatus[]).map((clave) => (
                <option key={clave} value={clave}>
                  {MARITAL_LABELS[clave]}
                </option>
              ))}
            </select>
          </label>

          {casado && (
            <>
              <fieldset className="opciones-conyuge">
                <legend>¿Su cónyuge atiende los exhibidores?</legend>
                <label className="opcion">
                  <input
                    type="radio"
                    name="modo-conyuge"
                    checked={modo === 'participante'}
                    onChange={() => setModo('participante')}
                  />
                  <span>Sí, está en el padrón</span>
                </label>
                <label className="opcion">
                  <input
                    type="radio"
                    name="modo-conyuge"
                    checked={modo === 'externo'}
                    onChange={() => setModo('externo')}
                  />
                  <span>No participa</span>
                </label>
              </fieldset>

              {modo === 'participante' ? (
                <label>
                  <span>Cónyuge</span>
                  <select value={conyugeId} onChange={(e) => setConyugeId(e.target.value)}>
                    <option value="">Sin especificar</option>
                    {candidatos.map((candidato) => (
                      <option key={candidato.id} value={candidato.id}>
                        {nombreFormal(candidato)}
                      </option>
                    ))}
                  </select>
                  <span className="tenue" style={{ marginTop: '0.2rem' }}>
                    Solo aparecen quienes no tienen pareja registrada. La relación queda guardada en
                    ambos.
                  </span>
                </label>
              ) : (
                <label>
                  <span>Nombre del cónyuge</span>
                  <input
                    value={conyugeNombre}
                    onChange={(e) => setConyugeNombre(e.target.value)}
                    placeholder="Nombre y apellido"
                  />
                  <span className="tenue" style={{ marginTop: '0.2rem' }}>
                    Solo el nombre, como referencia. No se guarda ningún otro dato ni se le envía
                    nada.
                  </span>
                </label>
              )}
            </>
          )}
        </fieldset>

        <div className="dialogo-acciones">
          <button onClick={onCerrar} disabled={ocupado}>
            Volver
          </button>
          <button
            className="primario"
            onClick={() => void guardar()}
            disabled={ocupado || !nombre.trim() || !paterno.trim()}
          >
            {ocupado ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
