'use client';

import { useState } from 'react';

/**
 * Copia al portapapeles con respaldo, porque `navigator.clipboard` no existe en
 * contextos sin HTTPS ni en algunos navegadores de escritorio antiguos.
 */
export async function copiar(texto: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(texto);
      return true;
    }
  } catch {
    // Se intenta el respaldo de abajo.
  }

  try {
    const area = document.createElement('textarea');
    area.value = texto;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

export function BotonCopiar({
  texto,
  etiqueta,
  principal,
  onCopiado,
}: {
  texto: string;
  etiqueta?: string;
  /** Deja el botón destacado siempre, no solo al acabar de copiar. */
  principal?: boolean;
  /**
   * Se llama **solo si la copia salió bien**. Lo usa la pantalla de
   * confirmaciones para preguntar después si el mensaje ya se publicó: si el
   * portapapeles falla, no hay nada que confirmar.
   */
  onCopiado?: () => void;
}) {
  const [estado, setEstado] = useState<'listo' | 'copiado' | 'error'>('listo');

  async function alCopiar() {
    const ok = await copiar(texto);
    setEstado(ok ? 'copiado' : 'error');
    window.setTimeout(() => setEstado('listo'), 2000);
    if (ok) onCopiado?.();
  }

  return (
    <button
      className={principal || estado === 'copiado' ? 'primario' : ''}
      onClick={() => void alCopiar()}
    >
      {estado === 'copiado'
        ? '¡Copiado!'
        : estado === 'error'
          ? 'Copia manual'
          : (etiqueta ?? 'Copiar')}
    </button>
  );
}
