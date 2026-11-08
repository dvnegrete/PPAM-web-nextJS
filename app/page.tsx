'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, clearSession, getSession, Session } from '@/lib/api';
import { ADMIN_ROLE_LABELS, type CuentaDelPanel, type Location } from '@/lib/types';
import { Ajustes } from './ajustes';
import { Bitacora } from './bitacora';
import { Calendario } from './calendario';
import { Confirmaciones } from './confirmaciones';
import { Encuesta } from './encuesta';
import { Tablero } from './tablero';
import { Usuarios } from './usuarios';
import { CambiarContrasena } from './cambiar-contrasena';
import { Importar } from './importar';
import { LoginForm } from './login-form';
import { GRUPOS, Navegacion, type Pestana } from './navegacion';
import { Padron } from './padron';
import { Reportes } from './reportes';
import { RolDelMes } from './rol-del-mes';
import { TurnosFijos } from './turnos-fijos';

/**
 * Las pestañas, con quién las ve.
 *
 * `soloAdmin` se declara aquí **y** se exige en el servidor con `@SoloAdmin()`.
 * Esconder el botón no es una medida de seguridad: es cortesía para que nadie
 * abra una pantalla que va a rechazarle cada petición.
 */
const PESTANAS = [
  { id: 'tablero', etiqueta: 'Tablero', grupo: 'operacion' },
  { id: 'calendario', etiqueta: 'Calendario', grupo: 'operacion' },
  {
    id: 'encuesta',
    etiqueta: 'Encuesta',
    grupo: 'whatsapp',
    descripcion: 'Turnos con lugar disponible para inscribirse',
  },
  {
    id: 'confirmaciones',
    etiqueta: 'Confirmaciones',
    grupo: 'whatsapp',
    descripcion: 'Mensaje para que cada quien confirme su turno',
  },
  {
    id: 'rol',
    etiqueta: 'Rol del mes',
    grupo: 'whatsapp',
    descripcion: 'Imágenes con turnos, nombres y teléfonos',
  },
  { id: 'padron', etiqueta: 'Participantes', grupo: 'personas' },
  { id: 'turnos-fijos', etiqueta: 'Turnos fijos', grupo: 'personas' },
  { id: 'reportes', etiqueta: 'Reportes', grupo: 'analisis' },
  { id: 'bitacora', etiqueta: 'Bitácora', grupo: 'analisis' },
  { id: 'usuarios', etiqueta: 'Usuarios', grupo: 'admin', soloAdmin: true },
  { id: 'importar', etiqueta: 'Importar', grupo: 'admin', soloAdmin: true },
  { id: 'ajustes', etiqueta: 'Ajustes', grupo: 'admin', soloAdmin: true },
] as const satisfies readonly Pestana[];

type PestanaId = (typeof PESTANAS)[number]['id'];

export default function Page() {
  const [session, setSession] = useState<Session | null>(null);
  const [listo, setListo] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [pestana, setPestana] = useState<PestanaId>('tablero');
  const [cuenta, setCuenta] = useState<CuentaDelPanel | null>(null);
  const [cambiandoClave, setCambiandoClave] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSession(getSession());
    setListo(true);
  }, []);

  const cargarCuenta = useCallback(async () => {
    try {
      setCuenta(await api<CuentaDelPanel>('/me'));
    } catch (problem) {
      if (problem instanceof Error && problem.message.includes('sesión')) {
        setSession(null);
        return;
      }
      setError(problem instanceof Error ? problem.message : 'No se pudo cargar tu cuenta');
    }
  }, []);

  const cargarLocations = useCallback(async () => {
    try {
      const data = await api<Location[]>('/locations');
      setLocations(data);
      setLocationId((actual) => actual ?? data[0]?.id ?? null);
    } catch (problem) {
      if (problem instanceof Error && problem.message.includes('sesión')) {
        setSession(null);
        return;
      }
      setError(problem instanceof Error ? problem.message : 'No se pudieron cargar los puntos');
    }
  }, []);

  useEffect(() => {
    if (session) void cargarCuenta();
  }, [session, cargarCuenta]);

  // Los puntos se piden solo cuando ya se puede navegar: con el cambio de
  // contraseña pendiente el servidor rechaza todo lo demás, y pedirlo llenaría
  // la pantalla de errores que no son el problema.
  useEffect(() => {
    if (session && cuenta && !cuenta.mustChangePassword) void cargarLocations();
  }, [session, cuenta, cargarLocations]);

  if (!listo) return null;
  if (!session) return <LoginForm onLogin={setSession} />;

  function salir() {
    clearSession();
    setSession(null);
    setCuenta(null);
  }

  // Una contraseña impuesta por un administrador bloquea todo lo demás: el
  // servidor rechaza cualquier otra petición hasta cambiarla, así que no hay
  // panel que mostrar detrás.
  if (cuenta?.mustChangePassword) {
    return (
      <div className="panel">
        <header className="cabecera">
          <h1>Horarios del exhibidor</h1>
        </header>
        <CambiarContrasena obligatorio onListo={salir} />
      </div>
    );
  }

  const location = locations.find((item) => item.id === locationId);
  const visibles = PESTANAS.filter(
    (item) => !('soloAdmin' in item && item.soloAdmin) || cuenta?.role === 'ADMIN',
  );
  const actual = PESTANAS.find((item) => item.id === pestana);
  const grupo = GRUPOS.find((item) => item.id === actual?.grupo);

  return (
    <div className="armazon">
      <Navegacion
        pestanas={visibles}
        activa={pestana}
        onElegir={(id) => setPestana(id as PestanaId)}
        locations={locations}
        locationId={locationId}
        onElegirLocation={setLocationId}
        nombre={cuenta?.perfil.fullName ?? session.name}
        correo={cuenta?.email ?? null}
        rol={cuenta ? ADMIN_ROLE_LABELS[cuenta.role] : null}
        onCambiarContrasena={() => setCambiandoClave(true)}
        onSalir={salir}
      />

      <main className="contenido">
        <header className="contenido-cabecera">
          <p className="tenue">
            {[grupo?.etiqueta, location?.name ?? 'Cargando punto…'].filter(Boolean).join(' · ')}
          </p>
          <h1>{actual?.etiqueta}</h1>
        </header>

        <div className="contenido-cuerpo">
          {error && <div className="aviso error">{error}</div>}

          {location && (
            <>
              {pestana === 'tablero' && <Tablero locationId={location.id} />}
              {pestana === 'encuesta' && <Encuesta locationId={location.id} />}
              {pestana === 'confirmaciones' && <Confirmaciones locationId={location.id} />}
              {pestana === 'rol' && <RolDelMes locationId={location.id} />}
              {pestana === 'calendario' && (
                <Calendario locationId={location.id} minCapacity={location.minCapacity} />
              )}
              {pestana === 'padron' && <Padron locationId={location.id} />}
              {pestana === 'turnos-fijos' && <TurnosFijos locationId={location.id} />}
              {pestana === 'usuarios' && <Usuarios locationId={location.id} />}
              {pestana === 'importar' && <Importar locationId={location.id} />}
              {pestana === 'reportes' && <Reportes locationId={location.id} />}
              {pestana === 'bitacora' && <Bitacora esAdmin={cuenta?.role === 'ADMIN'} />}
              {pestana === 'ajustes' && (
                <Ajustes location={location} onPuntoActualizado={cargarLocations} />
              )}
            </>
          )}
        </div>
      </main>

      {/* Cambiar la contraseña cierra todas las sesiones, incluida esta: hay que
          volver a entrar, y eso es justo lo que se busca. Como diálogo, quien se
          arrepiente vuelve a donde estaba sin perder la pantalla. */}
      {cambiandoClave && (
        <CambiarContrasena
          obligatorio={false}
          onListo={salir}
          onCerrar={() => setCambiandoClave(false)}
        />
      )}
    </div>
  );
}
