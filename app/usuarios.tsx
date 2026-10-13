'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { ADMIN_ROLE_LABELS } from '@/lib/types';
import type { AdminRole, CuentaDelPanel, Participant } from '@/lib/types';
import { EditarCuenta } from './editar-cuenta';
import { GuardiaDeEncargados } from './guardia-encargados';

/**
 * Cuentas del panel.
 *
 * Antes esta pestaña solo editaba las franjas de guardia, y quién era encargado
 * se decidía en el Padrón: dos pantallas para una sola idea. Ahora las cuentas
 * se dan de alta aquí, y marcar una como encargado también le da su rol en el
 * padrón, de modo que no hay que acordarse de hacerlo dos veces.
 */
export function Usuarios({ locationId }: { locationId: string }) {
  const [cuentas, setCuentas] = useState<CuentaDelPanel[]>([]);
  const [padron, setPadron] = useState<Participant[]>([]);
  const [editando, setEditando] = useState<CuentaDelPanel | null>(null);
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      const [lista, gente] = await Promise.all([
        api<CuentaDelPanel[]>('/admin-users'),
        api<Participant[]>(`/locations/${locationId}/participants`),
      ]);
      setCuentas(lista);
      setPadron(gente);
    } catch (problema) {
      setError(problema instanceof Error ? problema.message : 'No se pudieron cargar las cuentas');
    } finally {
      setCargando(false);
    }
  }, [locationId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  if (cargando) return <p className="tenue">Cargando cuentas…</p>;

  const administradores = cuentas.filter((c) => c.role === 'ADMIN' && c.active).length;

  return (
    <section>
      {error && <div className="aviso error">{error}</div>}
      {aviso && <div className="aviso exito">{aviso}</div>}

      <div className="tablero-barra">
        <p className="tenue" style={{ margin: 0 }}>
          {cuentas.length} cuenta(s) · {administradores} administrador(es) activo(s)
        </p>
        <button className="primario" onClick={() => setCreando(true)}>
          Dar de alta una cuenta
        </button>
      </div>

      <div className="tarjeta">
        <table className="cuentas-tabla">
          <thead>
            <tr>
              <th>Correo</th>
              <th>Nombre</th>
              <th>Nivel</th>
              <th className="secundaria">Del padrón</th>
              <th className="secundaria">Último acceso</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {cuentas.map((cuenta) => (
              <tr key={cuenta.id} className={cuenta.active ? '' : 'inactiva'}>
                <td>
                  {cuenta.email}
                  {!cuenta.active && <span className="etiqueta critico">Sin acceso</span>}
                  {cuenta.mustChangePassword && cuenta.active && (
                    <span className="etiqueta faltante">Debe cambiar su contraseña</span>
                  )}
                </td>
                <td>
                  {cuenta.perfil.formalName || <span className="tenue">—</span>}
                  {cuenta.perfil.phone && (
                    <span className="tenue telefono"> {cuenta.perfil.phone}</span>
                  )}
                </td>
                <td>
                  <span
                    className={`etiqueta ${cuenta.role === 'ADMIN' ? 'completo' : ''}`}
                  >
                    {ADMIN_ROLE_LABELS[cuenta.role]}
                  </span>
                </td>
                <td className="secundaria">
                  {cuenta.perfil.fromPadron ? (
                    'Sí'
                  ) : (
                    <span className="tenue">No</span>
                  )}
                </td>
                <td className="secundaria tenue">
                  {cuenta.lastLoginAt
                    ? new Date(cuenta.lastLoginAt).toLocaleDateString('es-MX', {
                        day: 'numeric',
                        month: 'short',
                      })
                    : 'nunca'}
                </td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <button className="accion" onClick={() => setEditando(cuenta)}>
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {cuentas.length === 0 && (
          <p className="tenue">Todavía no hay ninguna cuenta además de la tuya.</p>
        )}
      </div>

      <GuardiaDeEncargados locationId={locationId} />

      {(creando || editando) && (
        <EditarCuenta
          cuenta={editando}
          padron={padron}
          rolesDisponibles={['ADMIN', 'SUPERVISOR'] as AdminRole[]}
          ultimoAdministrador={administradores <= 1}
          onGuardado={async (mensaje) => {
            await cargar();
            setAviso(mensaje);
          }}
          onCerrar={() => {
            setCreando(false);
            setEditando(null);
          }}
        />
      )}
    </section>
  );
}
