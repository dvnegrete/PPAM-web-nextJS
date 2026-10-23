'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Location, LocationSettings } from '@/lib/types';

const CAMPOS: Array<{ clave: keyof LocationSettings; etiqueta: string; ayuda: string }> = [
  {
    clave: 'urgentWindowHours',
    etiqueta: 'Ventana de urgencia (horas)',
    ayuda: 'Una cancelación de un turno que ocurre dentro de este plazo se marca urgente.',
  },
  {
    clave: 'supervisorTimeoutMinutes',
    etiqueta: 'Plazo del encargado (minutos)',
    ayuda: 'Tiempo para atender una solicitud normal antes de escalarla al resto.',
  },
  {
    clave: 'urgentSupervisorTimeoutMinutes',
    etiqueta: 'Plazo urgente (minutos)',
    ayuda: 'Al vencer, el sistema resuelve solo si está activada la resolución automática.',
  },
  {
    clave: 'coverageCloseHoursBeforeShift',
    etiqueta: 'Cierre de vacantes (horas antes)',
    ayuda: 'A partir de este punto ya no se aceptan ofrecimientos para el turno.',
  },
  {
    clave: 'reminderHourLocal',
    etiqueta: 'Hora del recordatorio',
    ayuda: 'Hora local a la que salen los recordatorios (0 a 23).',
  },
  {
    clave: 'weekdayReminderDaysAhead',
    etiqueta: 'Anticipación entre semana (días)',
    ayuda: 'De lunes a viernes, con cuántos días de anticipación se recuerda.',
  },
  {
    clave: 'weekendReminderDaysAhead',
    etiqueta: 'Anticipación fin de semana (días)',
    ayuda: 'Sábado y domingo requieren más tiempo para conseguir reemplazo.',
  },
  {
    clave: 'scheduleHorizonMonths',
    etiqueta: 'Meses de calendario por adelantado',
    ayuda: 'Cuántos meses se materializan automáticamente cada noche.',
  },
  {
    clave: 'broadcastBatchSize',
    etiqueta: 'Máximo de avisos por vacante',
    ayuda: 'Controla el costo: cada aviso fuera de la ventana de 24 h consume una plantilla.',
  },
];

export function Ajustes({
  location,
  onPuntoActualizado,
}: {
  location: Location;
  onPuntoActualizado: () => void;
}) {
  const [settings, setSettings] = useState<LocationSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      setSettings(await api<LocationSettings>(`/locations/${location.id}/settings`));
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'No se pudieron cargar los ajustes');
    }
  }, [location.id]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function guardar(event: React.FormEvent) {
    event.preventDefault();
    if (!settings) return;
    setBusy(true);
    setError(null);
    setAviso(null);
    try {
      setSettings(
        await api<LocationSettings>(`/locations/${location.id}/settings`, {
          method: 'PATCH',
          body: settings,
        }),
      );
      setAviso('Ajustes guardados.');
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'No se pudieron guardar');
    } finally {
      setBusy(false);
    }
  }

  if (!settings) {
    return <p className="tenue">{error ?? 'Cargando…'}</p>;
  }

  return (
    <section>
      {error && <div className="aviso error">{error}</div>}
      {aviso && <div className="aviso exito">{aviso}</div>}

      <IdentidadDelPunto location={location} onGuardado={onPuntoActualizado} />

      <form onSubmit={guardar} className="tarjeta" style={{ maxWidth: 620 }}>
        <h3>Operación del punto</h3>
        {CAMPOS.map((campo) => (
          <label key={campo.clave}>
            <span>{campo.etiqueta}</span>
            <input
              type="number"
              value={String(settings[campo.clave])}
              onChange={(event) =>
                setSettings({ ...settings, [campo.clave]: Number(event.target.value) })
              }
              min={0}
            />
            <span className="tenue" style={{ marginTop: '0.2rem' }}>{campo.ayuda}</span>
          </label>
        ))}

        <hr style={{ border: 0, borderTop: '1px solid var(--borde)', margin: '1.25rem 0' }} />
        <h3>Mensajería por WhatsApp</h3>

        <label>
          <span>Modo de entrega</span>
          <select
            value={settings.messagingMode}
            onChange={(event) =>
              setSettings({ ...settings, messagingMode: event.target.value as 'test' | 'live' })
            }
          >
            <option value="test">Cuenta de prueba (solo números autorizados)</option>
            <option value="live">Número definitivo (todos los participantes)</option>
          </select>
          <span className="tenue" style={{ marginTop: '0.2rem' }}>
            Con una cuenta de prueba, Meta solo permite escribir a los números dados de alta. Los
            envíos a cualquier otro se omiten en vez de fallar.
          </span>
        </label>

        <label>
          <span>Números autorizados</span>
          <textarea
            rows={5}
            value={settings.allowedRecipients.join('\n')}
            onChange={(event) =>
              setSettings({
                ...settings,
                allowedRecipients: event.target.value
                  .split('\n')
                  .map((linea) => linea.trim())
                  .filter(Boolean),
              })
            }
            placeholder={'+525512345678\n+525598765432'}
          />
          <span className="tenue" style={{ marginTop: '0.2rem' }}>
            Uno por línea, tal como están dados de alta en la cuenta de prueba de Meta. Solo aplica
            en modo de prueba.
          </span>
        </label>

        <label style={{ display: 'flex', alignItems: 'start', gap: '0.5rem' }}>
          <input
            type="checkbox"
            checked={settings.broadcastCoverageToParticipants}
            onChange={(event) =>
              setSettings({
                ...settings,
                broadcastCoverageToParticipants: event.target.checked,
              })
            }
            style={{ width: 'auto', marginTop: '0.25rem' }}
          />
          <span style={{ margin: 0 }}>
            Avisar de las vacantes a los participantes
            <span className="tenue" style={{ display: 'block' }}>
              Apagado mientras la convocatoria se haga con la encuesta del grupo. Al encenderlo, el
              sistema difunde cada vacante por mensaje directo.
            </span>
          </span>
        </label>

        <label style={{ display: 'flex', alignItems: 'start', gap: '0.5rem' }}>
          <input
            type="checkbox"
            checked={settings.autoResolveUrgent}
            onChange={(event) =>
              setSettings({ ...settings, autoResolveUrgent: event.target.checked })
            }
            style={{ width: 'auto', marginTop: '0.25rem' }}
          />
          <span style={{ margin: 0 }}>
            Resolver automáticamente las vacantes urgentes vencidas
            <span className="tenue" style={{ display: 'block' }}>
              Si nadie de guardia responde a tiempo, el sistema aprueba al primero que se ofreció y
              lo deja registrado en la bitácora.
            </span>
          </span>
        </label>

        <button className="primario" type="submit" disabled={busy}>
          {busy ? 'Guardando…' : 'Guardar ajustes'}
        </button>
      </form>
    </section>
  );
}

/**
 * Nombre y dirección del punto. Van aparte de los ajustes operativos porque no
 * viven en `Location.settings` sino en sus propias columnas, y porque es lo
 * único de esta pantalla que la gente del grupo acaba leyendo.
 */
function IdentidadDelPunto({
  location,
  onGuardado,
}: {
  location: Location;
  onGuardado: () => void;
}) {
  const [nombre, setNombre] = useState(location.name);
  const [direccion, setDireccion] = useState(location.address ?? '');
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Al elegir otro punto arriba, el formulario tiene que mostrar el elegido.
  useEffect(() => {
    setNombre(location.name);
    setDireccion(location.address ?? '');
  }, [location.id, location.name, location.address]);

  async function guardar(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setAviso(null);
    try {
      await api<Location>(`/locations/${location.id}`, {
        method: 'PATCH',
        body: { name: nombre.trim(), address: direccion.trim() === '' ? null : direccion.trim() },
      });
      setAviso('Datos del punto guardados.');
      onGuardado();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'No se pudo guardar el punto');
    } finally {
      setBusy(false);
    }
  }

  const comoSeLee = [nombre.trim(), direccion.trim()].filter(Boolean).join(', ');

  return (
    <form onSubmit={guardar} className="tarjeta" style={{ maxWidth: 620, marginBottom: '1rem' }}>
      <h3>Datos del punto</h3>

      <label>
        <span>Nombre</span>
        <input
          value={nombre}
          onChange={(event) => setNombre(event.target.value)}
          maxLength={120}
          required
        />
        <span className="tenue" style={{ marginTop: '0.2rem' }}>
          Encabeza el panel y el mensaje que se publica en el grupo de suplencias.
        </span>
      </label>

      <label>
        <span>Dirección</span>
        <input
          value={direccion}
          onChange={(event) => setDireccion(event.target.value)}
          maxLength={200}
          placeholder="Secundaria #4"
        />
        <span className="tenue" style={{ marginTop: '0.2rem' }}>
          Opcional. Se escribe después del nombre, separada por coma; si se deja en blanco, el
          mensaje nombra solo el punto.
        </span>
      </label>

      {comoSeLee && (
        <p className="tenue" style={{ margin: '0 0 0.75rem' }}>
          En el mensaje del grupo se lee: <strong>{comoSeLee}</strong>
        </p>
      )}

      {error && <div className="aviso error">{error}</div>}
      {aviso && <div className="aviso exito">{aviso}</div>}

      <button className="primario" type="submit" disabled={busy || nombre.trim().length === 0}>
        {busy ? 'Guardando…' : 'Guardar datos del punto'}
      </button>
    </form>
  );
}
