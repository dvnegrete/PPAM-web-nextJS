'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, clearSession, getSession, Session } from '@/lib/api';
import type { Location } from '@/lib/types';
import { Ajustes } from './ajustes';
import { Calendario } from './calendario';
import { Encuesta } from './encuesta';
import { Tablero } from './tablero';
import { Encargados } from './encargados';
import { Importar } from './importar';
import { LoginForm } from './login-form';
import { Navegacion } from './navegacion';
import { Padron } from './padron';
import { Reportes } from './reportes';
import { TurnosFijos } from './turnos-fijos';

const PESTANAS = [
  { id: 'tablero', etiqueta: 'Tablero' },
  { id: 'encuesta', etiqueta: 'Encuesta' },
  { id: 'calendario', etiqueta: 'Calendario' },
  { id: 'padron', etiqueta: 'Padrón' },
  { id: 'turnos-fijos', etiqueta: 'Turnos fijos' },
  { id: 'encargados', etiqueta: 'Encargados' },
  { id: 'importar', etiqueta: 'Importar' },
  { id: 'reportes', etiqueta: 'Reportes' },
  { id: 'ajustes', etiqueta: 'Ajustes' },
] as const;

type PestanaId = (typeof PESTANAS)[number]['id'];

export default function Page() {
  const [session, setSession] = useState<Session | null>(null);
  const [listo, setListo] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [pestana, setPestana] = useState<PestanaId>('tablero');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSession(getSession());
    setListo(true);
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
    if (session) void cargarLocations();
  }, [session, cargarLocations]);

  if (!listo) return null;
  if (!session) return <LoginForm onLogin={setSession} />;

  const location = locations.find((item) => item.id === locationId);

  return (
    <div className="panel">
      <header className="cabecera">
        <div>
          <h1>Horarios del exhibidor</h1>
          <p className="tenue" style={{ margin: 0 }}>
            {location ? `${location.name} · ${location.timezone}` : 'Cargando punto…'}
          </p>
        </div>
      </header>

      <Navegacion
        pestanas={PESTANAS}
        activa={pestana}
        onElegir={(id) => setPestana(id as PestanaId)}
        locations={locations}
        locationId={locationId}
        onElegirLocation={setLocationId}
        nombre={session.name}
        onSalir={() => {
          clearSession();
          setSession(null);
        }}
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
          {pestana === 'encargados' && <Encargados locationId={location.id} />}
          {pestana === 'importar' && <Importar locationId={location.id} />}
          {pestana === 'reportes' && <Reportes locationId={location.id} />}
          {pestana === 'ajustes' && <Ajustes locationId={location.id} />}
        </>
      )}
    </div>
  );
}
