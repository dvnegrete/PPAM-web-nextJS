'use client';

import { useState } from 'react';
import type { NewParticipant } from '@/lib/services/participants';
import { ORGANIZATION_LABELS } from '@/lib/types';
import type { OrganizationField, OrganizationValues } from '@/lib/types';

const EMPTY_ORGANIZATION = { congregation: '', circuit: '', city: '' };

interface Props {
  /** Valores ya registrados, para sugerirlos al capturar. */
  knownValues: OrganizationValues;
  /** Da de alta; devuelve `true` si quedó registrado, para vaciar el formulario. */
  onCreate: (participant: NewParticipant) => Promise<boolean>;
}

/**
 * Alta de una persona a mano.
 *
 * Plegado: el padrón entra por CSV y dar de alta a mano es la excepción. Diez
 * campos abiertos empujaban el buscador y la tabla fuera de la vista.
 */
export function ParticipantCreateForm({ knownValues, onCreate }: Props) {
  const [nombre, setNombre] = useState('');
  const [paterno, setPaterno] = useState('');
  const [materno, setMaterno] = useState('');
  const [comoMostrar, setComoMostrar] = useState('');
  const [telefono, setTelefono] = useState('');
  const [rol, setRol] = useState('participante');
  const [org, setOrg] = useState(EMPTY_ORGANIZATION);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const created = await onCreate({
      firstName: nombre,
      paternalSurname: paterno,
      maternalSurname: materno || undefined,
      displayName: comoMostrar || undefined,
      phone: telefono,
      role: rol,
      congregation: org.congregation || undefined,
      circuit: org.circuit || undefined,
      city: org.city || undefined,
    });
    if (!created) return;

    setNombre('');
    setPaterno('');
    setMaterno('');
    setComoMostrar('');
    setTelefono('');
    setOrg(EMPTY_ORGANIZATION);
  }

  return (
    <details className="tarjeta plegable">
      <summary>Dar de alta a alguien nuevo</summary>
      <form onSubmit={submit} className="forma-alta">
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
              {knownValues[campo]?.map((valor) => (
                <option key={valor} value={valor} />
              ))}
            </datalist>
          </label>
        ))}
        <button className="primario" type="submit">
          Agregar
        </button>
      </form>
    </details>
  );
}
