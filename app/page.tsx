'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, clearSession, getSession, Session } from '@/lib/api';
import type { CuentaDelPanel, Location } from '@/lib/types';
import { Ajustes } from './ajustes';
import { Bitacora } from './bitacora';
import { Calendario } from './calendario';
import { Encuesta } from './encuesta';
import { Tablero } from './tablero';
import { Usuarios } from './usuarios';
import { CambiarContrasena } from './cambiar-contrasena';
import { Importar } from './importar';
import { LoginForm } from './login-form';
import { Navegacion } from './navegacion';
import { Padron } from './padron';
import { Reportes } from './reportes';
import { TurnosFijos } from './turnos-fijos';

/**
 * Las pestañas, con quién las ve.
 *
 * `soloAdmin` se declara aquí **y** se exige en el servidor con `@SoloAdmin()`.
 * Esconder el botón no es una medida de seguridad: es cortesía para que nadie
 * abra una pantalla que va a rechazarle cada petición.
 */
const PESTANAS = [
  { id: 'tablero', etiqueta: 'Tablero' },
  { id: 'encuesta', etiqueta: 'Encuesta' },
  { id: 'calendario', etiqueta: 'Calendario' },
  { id: 'padron', etiqueta: 'Padrón' },
  { id: 'turnos-fijos', etiqueta: 'Turnos fijos' },
  { id: 'reportes', etiqueta: 'Reportes' },
  { id: 'bitacora', etiqueta: 'Bitácora' },
  { id: 'usuarios', etiqueta: 'Usuarios', soloAdmin: true },
  { id: 'importar', etiqueta: 'Importar', soloAdmin: true },
  { id: 'ajustes', etiqueta: 'Ajustes', soloAdmin: true },
] as const;

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

  // Cambiar la contraseña cierra todas las sesiones, incluida esta: hay que
  // volver a entrar, y eso es justo lo que se busca.
  if (cuenta?.mustChangePassword || cambiandoClave) {
    return (
      <div className="panel">
        <header className="cabecera">
          <h1>Horarios del exhibidor</h1>
        </header>
        <CambiarContrasena
          obligatorio={cuenta?.mustChangePassword ?? false}
          onListo={salir}
          onCerrar={cambiandoClave ? () => setCambiandoClave(false) : undefined}
        />
      </div>
    );
  }

  const location = locations.find((item) => item.id === locationId);
  const visibles = PESTANAS.filter(
    (item) => !('soloAdmin' in item && item.soloAdmin) || cuenta?.role === 'ADMIN',
  );

  return (
    <div className="panel">
      <header className="cabecera">
        <div>
          <h1>{location ? `Horarios ${location.name}` : 'Horarios del exhibidor'}</h1>
          <p className="tenue" style={{ margin: 0 }}>
            {location
              ? [location.address, location.timezone].filter(Boolean).join(' · ')
              : 'Cargando punto…'}
          </p>
        </div>
      </header>

      <Navegacion
        pestanas={visibles}
        activa={pestana}
        onElegir={(id) => setPestana(id as PestanaId)}
        locations={locations}
        locationId={locationId}
        onElegirLocation={setLocationId}
        nombre={cuenta?.perfil.fullName ?? session.name}
        onCambiarContrasena={() => setCambiandoClave(true)}
        onSalir={salir}
      />

      {error && <div className="aviso error">{error}</div>}

      {location && (
        <>
          {pestana === 'tablero' && <Tablero locationId={location.id} />}
          {pestana === 'encuesta' && <Encuesta locationId={location.id} />}
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
  );
}
