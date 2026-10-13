'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

interface Props {
  /** Cuando la impuso un administrador, no hay forma de posponerlo. */
  obligatorio: boolean;
  onListo: () => void;
  onCerrar?: () => void;
}

const MINIMO = 8;

/**
 * Cambiar la propia contraseña.
 *
 * Se exige la actual a propósito: sin eso, un token robado bastaría para
 * quedarse con la cuenta. Y al guardar, el servidor cierra **todas** las
 * sesiones —incluida esta—, así que hay que volver a entrar. Eso es lo que se
 * busca al cambiar una contraseña, pero conviene avisarlo antes.
 */
export function CambiarContrasena({ obligatorio, onListo, onCerrar }: Props) {
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [repetida, setRepetida] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const corta = nueva.length > 0 && nueva.length < MINIMO;
  const noCoinciden = repetida.length > 0 && nueva !== repetida;
  const listo = actual.length > 0 && nueva.length >= MINIMO && nueva === repetida;

  async function guardar() {
    setOcupado(true);
    setError(null);
    try {
      await api('/me/password', { method: 'POST', body: { current: actual, password: nueva } });
      onListo();
    } catch (problema) {
      setError(problema instanceof Error ? problema.message : 'No se pudo cambiar');
      setOcupado(false);
    }
  }

  return (
    <div className="tarjeta" style={{ maxWidth: 440, margin: '0 auto' }}>
      <h3>{obligatorio ? 'Cambia tu contraseña para continuar' : 'Cambiar mi contraseña'}</h3>
      <p className="tenue">
        {obligatorio
          ? 'La que tienes la puso un administrador, así que alguien más la conoce. Elige una propia antes de entrar.'
          : 'Al guardar se cerrarán todas tus sesiones y tendrás que volver a entrar.'}
      </p>

      {error && <div className="aviso error">{error}</div>}

      <label>
        <span>Contraseña actual</span>
        <input
          type="password"
          value={actual}
          onChange={(evento) => setActual(evento.target.value)}
          autoComplete="current-password"
          autoFocus
        />
      </label>

      <label>
        <span>Contraseña nueva</span>
        <input
          type="password"
          value={nueva}
          onChange={(evento) => setNueva(evento.target.value)}
          autoComplete="new-password"
        />
        <span className="tenue" style={{ marginTop: '0.2rem' }}>
          {corta ? `Faltan ${MINIMO - nueva.length} caracteres` : `Mínimo ${MINIMO} caracteres`}
        </span>
      </label>

      <label>
        <span>Repítela</span>
        <input
          type="password"
          value={repetida}
          onChange={(evento) => setRepetida(evento.target.value)}
          autoComplete="new-password"
        />
        {noCoinciden && (
          <span className="tenue" style={{ marginTop: '0.2rem' }}>
            Las dos no coinciden
          </span>
        )}
      </label>

      <div className="dialogo-acciones">
        {!obligatorio && onCerrar && (
          <button onClick={onCerrar} disabled={ocupado}>
            Volver
          </button>
        )}
        <button className="primario" onClick={() => void guardar()} disabled={ocupado || !listo}>
          {ocupado ? 'Guardando…' : 'Cambiar contraseña'}
        </button>
      </div>
    </div>
  );
}
