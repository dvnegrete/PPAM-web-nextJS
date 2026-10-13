'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { nombreFormal } from '@/lib/nombres';
import { ADMIN_ROLE_LABELS } from '@/lib/types';
import type { AdminRole, CuentaDelPanel, Participant } from '@/lib/types';

interface Props {
  /** `null` para dar de alta. */
  cuenta: CuentaDelPanel | null;
  padron: Participant[];
  rolesDisponibles: AdminRole[];
  /** Si solo queda un administrador activo, hay cosas que no se pueden hacer. */
  ultimoAdministrador: boolean;
  onGuardado: (mensaje: string) => Promise<void> | void;
  onCerrar: () => void;
}

const MINIMO = 8;

/**
 * Alta y edición de una cuenta del panel.
 *
 * Los datos básicos solo se piden cuando la cuenta **no** está vinculada al
 * padrón. Si lo está, los suyos son los del participante y se editan allí: la
 * pantalla lo dice en lugar de mostrar campos que no harían nada.
 */
export function EditarCuenta({
  cuenta,
  padron,
  rolesDisponibles,
  ultimoAdministrador,
  onGuardado,
  onCerrar,
}: Props) {
  const esAlta = cuenta === null;

  const [email, setEmail] = useState(cuenta?.email ?? '');
  const [role, setRole] = useState<AdminRole>(cuenta?.role ?? 'SUPERVISOR');
  const [active, setActive] = useState(cuenta?.active ?? true);
  const [participantId, setParticipantId] = useState(cuenta?.participantId ?? '');
  const [password, setPassword] = useState('');
  const [datos, setDatos] = useState({
    firstName: cuenta?.perfil.fromPadron ? '' : (cuenta?.perfil.firstName ?? ''),
    paternalSurname: cuenta?.perfil.fromPadron ? '' : (cuenta?.perfil.paternalSurname ?? ''),
    maternalSurname: cuenta?.perfil.fromPadron ? '' : (cuenta?.perfil.maternalSurname ?? ''),
    phone: cuenta?.perfil.fromPadron ? '' : (cuenta?.perfil.phone ?? ''),
    congregation: cuenta?.perfil.fromPadron ? '' : (cuenta?.perfil.congregation ?? ''),
  });
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const vinculada = participantId !== '';
  const persona = padron.find((p) => p.id === participantId);
  // Degradar o desactivar al último administrador dejaría el sistema sin nadie
  // que pueda gestionarlo; el servidor lo rechaza y aquí se avisa antes.
  const seQuedaSinAdmins =
    !esAlta && cuenta.role === 'ADMIN' && cuenta.active && ultimoAdministrador &&
    (role !== 'ADMIN' || !active);

  const listo =
    email.trim() !== '' &&
    (!esAlta || password.length >= MINIMO) &&
    (vinculada || (datos.firstName.trim() !== '' && datos.paternalSurname.trim() !== '')) &&
    !seQuedaSinAdmins;

  async function guardar() {
    setOcupado(true);
    setError(null);
    try {
      const propios = vinculada
        ? {}
        : {
            firstName: datos.firstName.trim(),
            paternalSurname: datos.paternalSurname.trim(),
            maternalSurname: datos.maternalSurname.trim() || null,
            phone: datos.phone.trim() || null,
            congregation: datos.congregation.trim() || null,
          };

      if (esAlta) {
        await api('/admin-users', {
          method: 'POST',
          body: {
            email: email.trim(),
            password,
            role,
            participantId: participantId || null,
            ...propios,
          },
        });
        await onGuardado(
          `Cuenta creada. Pásale la contraseña: el sistema le pedirá cambiarla al entrar.`,
        );
      } else {
        await api(`/admin-users/${cuenta.id}`, {
          method: 'PATCH',
          body: { email: email.trim(), role, active, participantId: participantId || null, ...propios },
        });
        await onGuardado('Cuenta actualizada.');
      }
      onCerrar();
    } catch (problema) {
      setError(problema instanceof Error ? problema.message : 'No se pudo guardar');
      setOcupado(false);
    }
  }

  async function restablecer() {
    if (!cuenta) return;
    const nueva = window.prompt(
      `Contraseña nueva para ${cuenta.email} (mínimo ${MINIMO} caracteres).\n\n` +
        'Se le pedirá cambiarla al entrar, y sus sesiones abiertas se cerrarán.',
    );
    if (!nueva) return;

    setOcupado(true);
    setError(null);
    try {
      await api(`/admin-users/${cuenta.id}/password`, {
        method: 'POST',
        body: { password: nueva },
      });
      await onGuardado(`Contraseña de ${cuenta.email} restablecida.`);
      onCerrar();
    } catch (problema) {
      setError(problema instanceof Error ? problema.message : 'No se pudo restablecer');
      setOcupado(false);
    }
  }

  return (
    <div className="telon" role="dialog" aria-modal="true" aria-label="Cuenta del panel">
      <div className="dialogo dialogo-ancho">
        <h3>{esAlta ? 'Dar de alta una cuenta' : 'Editar cuenta'}</h3>
        {!esAlta && <p className="tenue">{cuenta.email}</p>}

        {error && <div className="aviso error">{error}</div>}
        {seQuedaSinAdmins && (
          <div className="aviso atencion">
            Es el único administrador activo. Nombra a otro antes de quitarle el acceso o bajarle el
            nivel.
          </div>
        )}

        <fieldset className="grupo">
          <legend>Acceso</legend>
          <label>
            <span>Correo</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="off"
              autoFocus
            />
          </label>

          {esAlta && (
            <label>
              <span>Contraseña inicial</span>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="off"
              />
              <span className="tenue" style={{ marginTop: '0.2rem' }}>
                Mínimo {MINIMO} caracteres. Se la pasas tú, y el sistema le pedirá cambiarla la
                primera vez que entre.
              </span>
            </label>
          )}

          <div className="campos-par">
            <label>
              <span>Nivel</span>
              <select value={role} onChange={(e) => setRole(e.target.value as AdminRole)}>
                {rolesDisponibles.map((valor) => (
                  <option key={valor} value={valor}>
                    {ADMIN_ROLE_LABELS[valor]}
                  </option>
                ))}
              </select>
              <span className="tenue" style={{ marginTop: '0.2rem' }}>
                {role === 'ADMIN'
                  ? 'Todo, incluidos ajustes, importación y cuentas.'
                  : 'Tablero, calendario, encuesta y padrón.'}
              </span>
            </label>

            {!esAlta && (
              <label className="casilla" style={{ alignSelf: 'end' }}>
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                />
                <span>Puede entrar al panel</span>
              </label>
            )}
          </div>
        </fieldset>

        <fieldset className="grupo">
          <legend>Quién es</legend>
          <label>
            <span>Del padrón (opcional)</span>
            <select value={participantId} onChange={(e) => setParticipantId(e.target.value)}>
              <option value="">No está en el padrón</option>
              {padron.map((p) => (
                <option key={p.id} value={p.id}>
                  {nombreFormal(p)}
                </option>
              ))}
            </select>
          </label>

          {vinculada ? (
            <div className="aviso" style={{ background: 'var(--fondo)', marginBottom: 0 }}>
              Sus datos son los de <strong>{persona ? nombreFormal(persona) : 'el padrón'}</strong>
              {persona?.phoneE164 && ` · ${persona.phoneE164}`}
              {persona?.congregation && ` · ${persona.congregation}`}.
              <br />
              <span className="tenue">
                Se editan en la pestaña Padrón, no aquí: así el mismo dato no acaba con dos valores
                distintos.
              </span>
              {role === 'SUPERVISOR' && (
                <>
                  <br />
                  <span className="tenue">
                    Al guardar queda también como encargado en WhatsApp.
                  </span>
                </>
              )}
            </div>
          ) : (
            <>
              <div className="campos-par">
                <label>
                  <span>Nombre</span>
                  <input
                    value={datos.firstName}
                    onChange={(e) => setDatos({ ...datos, firstName: e.target.value })}
                  />
                </label>
                <label>
                  <span>Apellido paterno</span>
                  <input
                    value={datos.paternalSurname}
                    onChange={(e) => setDatos({ ...datos, paternalSurname: e.target.value })}
                  />
                </label>
                <label>
                  <span>Apellido materno</span>
                  <input
                    value={datos.maternalSurname}
                    onChange={(e) => setDatos({ ...datos, maternalSurname: e.target.value })}
                    placeholder="Opcional"
                  />
                </label>
                <label>
                  <span>Teléfono</span>
                  <input
                    value={datos.phone}
                    onChange={(e) => setDatos({ ...datos, phone: e.target.value })}
                    placeholder="Opcional"
                  />
                </label>
              </div>
              <label style={{ marginBottom: 0 }}>
                <span>Congregación</span>
                <input
                  value={datos.congregation}
                  onChange={(e) => setDatos({ ...datos, congregation: e.target.value })}
                  placeholder="Opcional"
                />
              </label>
            </>
          )}
        </fieldset>

        <div className="dialogo-acciones">
          {!esAlta && (
            <button onClick={() => void restablecer()} disabled={ocupado}>
              Restablecer contraseña
            </button>
          )}
          <button onClick={onCerrar} disabled={ocupado}>
            Volver
          </button>
          <button className="primario" onClick={() => void guardar()} disabled={ocupado || !listo}>
            {ocupado ? 'Guardando…' : esAlta ? 'Dar de alta' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
