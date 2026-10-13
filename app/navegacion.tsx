'use client';

import { useEffect, useRef, useState } from 'react';
import type { Location } from '@/lib/types';

export interface Pestana {
  id: string;
  etiqueta: string;
  /** Declarado en `page.tsx`; aquí solo se pinta lo que llega filtrado. */
  soloAdmin?: boolean;
}

interface Props {
  pestanas: readonly Pestana[];
  activa: string;
  onElegir: (id: string) => void;
  locations: Location[];
  locationId: string | null;
  onElegirLocation: (id: string) => void;
  nombre: string;
  onCambiarContrasena: () => void;
  onSalir: () => void;
}

/**
 * Navegación del panel: fila de pestañas en pantalla cómoda, menú de
 * hamburguesa en el teléfono.
 *
 * Las ocho pestañas más el selector de punto, el nombre y «Salir» no caben en
 * una pantalla de teléfono: envueltas ocupaban cuatro renglones y empujaban el
 * contenido fuera de la vista, de modo que al entrar no se veía el calendario
 * sino un muro de botones. En el menú, lo que se ve al abrir la app es el
 * contenido.
 *
 * El mismo marcado sirve para las dos formas y es el CSS quien decide: así no
 * hay dos árboles que mantener en paralelo ni un salto al cambiar de tamaño.
 */
export function Navegacion({
  pestanas,
  activa,
  onElegir,
  locations,
  locationId,
  onElegirLocation,
  nombre,
  onCambiarContrasena,
  onSalir,
}: Props) {
  const [abierto, setAbierto] = useState(false);
  const panel = useRef<HTMLDivElement>(null);

  // Cerrar con Escape y al tocar fuera: en un menú que tapa el contenido, no
  // poder salir sin acertarle al botón es la forma más rápida de atascarse.
  useEffect(() => {
    if (!abierto) return;

    function alTeclear(evento: KeyboardEvent) {
      if (evento.key === 'Escape') setAbierto(false);
    }
    function alTocar(evento: MouseEvent) {
      if (panel.current && !panel.current.contains(evento.target as Node)) setAbierto(false);
    }

    document.addEventListener('keydown', alTeclear);
    document.addEventListener('mousedown', alTocar);
    return () => {
      document.removeEventListener('keydown', alTeclear);
      document.removeEventListener('mousedown', alTocar);
    };
  }, [abierto]);

  const etiquetaActiva = pestanas.find((item) => item.id === activa)?.etiqueta ?? '';

  return (
    <div className="navegacion" ref={panel}>
      <button
        className="hamburguesa"
        onClick={() => setAbierto(!abierto)}
        aria-expanded={abierto}
        aria-controls="menu-panel"
        aria-label={abierto ? 'Cerrar menú' : `Menú · ${etiquetaActiva}`}
      >
        <span className="barras" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
        <span className="rotulo-activo">{etiquetaActiva}</span>
      </button>

      <div id="menu-panel" className={`menu ${abierto ? 'abierto' : ''}`}>
        <nav className="pestanas">
          {pestanas.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onElegir(item.id);
                setAbierto(false);
              }}
              className={activa === item.id ? 'primario' : ''}
              aria-current={activa === item.id ? 'page' : undefined}
            >
              {item.etiqueta}
            </button>
          ))}
        </nav>

        <div className="sesion">
          {locations.length > 1 && (
            <select
              value={locationId ?? ''}
              onChange={(evento) => onElegirLocation(evento.target.value)}
              aria-label="Punto de exhibición"
            >
              {locations.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          )}
          <span className="tenue">{nombre}</span>
          {/* Aquí y no solo en la pestaña Usuarios: cambiar la propia
              contraseña es de cualquiera, incluido quien no ve esa pestaña. */}
          <button
            onClick={() => {
              onCambiarContrasena();
              setAbierto(false);
            }}
          >
            Mi contraseña
          </button>
          <button onClick={onSalir}>Salir</button>
        </div>
      </div>
    </div>
  );
}
