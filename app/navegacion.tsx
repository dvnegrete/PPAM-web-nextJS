'use client';

import { useEffect, useRef, useState } from 'react';
import type { Location } from '@/lib/types';
import { Icono, type NombreIcono } from './iconos';
import { IconoWhatsApp } from './icono-whatsapp';

export type GrupoId = 'operacion' | 'whatsapp' | 'personas' | 'analisis' | 'admin';

export interface Pestana {
  id: string;
  etiqueta: string;
  grupo: GrupoId;
  /** Declarado en `page.tsx`; aquí solo se pinta lo que llega filtrado. */
  soloAdmin?: boolean;
  /** Una línea de para qué sirve; la usa la sección WhatsApp del teléfono. */
  descripcion?: string;
}

/**
 * Los grupos, en el orden en que se recorren.
 *
 * Doce pestañas en una sola fila pesaban todas igual y cada función nueva era un
 * botón más. Agrupadas, una función nueva entra en su grupo sin mover nada, y el
 * nombre del grupo explica qué tienen en común sin leer cada pestaña.
 */
export const GRUPOS: ReadonlyArray<{ id: GrupoId; etiqueta: string }> = [
  { id: 'operacion', etiqueta: 'Operación' },
  { id: 'whatsapp', etiqueta: 'Para el grupo de WhatsApp' },
  { id: 'personas', etiqueta: 'Personas' },
  { id: 'analisis', etiqueta: 'Análisis' },
  { id: 'admin', etiqueta: 'Administración' },
];

/**
 * Las dos pestañas con botón propio en la barra inferior del teléfono. La barra
 * queda Tablero · WhatsApp · Padrón · Más; el resto, Calendario incluido, va en
 * «Más».
 */
const FIJAS_EN_TELEFONO = ['tablero', 'padron'];

interface Props {
  pestanas: readonly Pestana[];
  activa: string;
  onElegir: (id: string) => void;
  locations: Location[];
  locationId: string | null;
  onElegirLocation: (id: string) => void;
  nombre: string;
  correo: string | null;
  rol: string | null;
  onCambiarContrasena: () => void;
  onSalir: () => void;
}

type Hoja = 'whatsapp' | 'mas' | null;

/**
 * Navegación del panel.
 *
 * En pantalla cómoda es un menú lateral con las pestañas agrupadas y, al pie,
 * el menú de la cuenta. En el teléfono, una barra inferior con lo de todos los
 * días (Tablero, Padrón), lo que se prepara para el grupo (WhatsApp) y el
 * resto en «Más». Las dos formas viven en el mismo componente y el CSS decide
 * cuál se ve.
 *
 * La cuenta («Mi contraseña», «Cerrar sesión») va aparte de las secciones:
 * mezclada con ellas, cerrar sesión quedaba a un toque equivocado de distancia.
 */
export function Navegacion({
  pestanas,
  activa,
  onElegir,
  locations,
  locationId,
  onElegirLocation,
  nombre,
  correo,
  rol,
  onCambiarContrasena,
  onSalir,
}: Props) {
  const [cuentaAbierta, setCuentaAbierta] = useState(false);
  const [hoja, setHoja] = useState<Hoja>(null);
  const cuenta = useRef<HTMLDivElement>(null);

  // Escape cierra lo que esté abierto, y tocar fuera cierra el menú de cuenta:
  // en algo que tapa el contenido, no poder salir sin atinarle al botón es la
  // forma más rápida de atascarse.
  useEffect(() => {
    if (!cuentaAbierta && !hoja) return;

    function alTeclear(evento: KeyboardEvent) {
      if (evento.key !== 'Escape') return;
      setCuentaAbierta(false);
      setHoja(null);
    }
    function alTocar(evento: MouseEvent) {
      if (cuenta.current && !cuenta.current.contains(evento.target as Node)) {
        setCuentaAbierta(false);
      }
    }

    document.addEventListener('keydown', alTeclear);
    document.addEventListener('mousedown', alTocar);
    return () => {
      document.removeEventListener('keydown', alTeclear);
      document.removeEventListener('mousedown', alTocar);
    };
  }, [cuentaAbierta, hoja]);

  function elegir(id: string) {
    onElegir(id);
    setHoja(null);
    setCuentaAbierta(false);
  }

  function cambiarContrasena() {
    setHoja(null);
    setCuentaAbierta(false);
    onCambiarContrasena();
  }

  const grupoActivo = pestanas.find((item) => item.id === activa)?.grupo;
  const delGrupo = (grupo: GrupoId) => pestanas.filter((item) => item.grupo === grupo);
  const iniciales = nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join('');

  function botonFijo(id: string) {
    const item = pestanas.find((pestana) => pestana.id === id);
    if (!item) return null;
    const esActiva = activa === id && !hoja;
    return (
      <button
        className={esActiva ? 'activo' : ''}
        aria-current={esActiva ? 'page' : undefined}
        onClick={() => elegir(id)}
      >
        <Icono nombre={id as NombreIcono} tamano={22} />
        {item.etiqueta}
      </button>
    );
  }

  const selectorDePunto =
    locations.length > 1 ? (
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
    ) : (
      <strong>{locations.find((item) => item.id === locationId)?.name ?? '…'}</strong>
    );

  return (
    <>
      {/* ---------------- Pantalla cómoda: menú lateral ---------------- */}
      <aside className="lateral">
        <div className="lateral-marca">Horarios</div>

        <div className="lateral-punto">
          <Icono nombre="punto" />
          <div>
            <span className="tenue">Punto de exhibición</span>
            {selectorDePunto}
          </div>
        </div>

        <nav className="lateral-secciones" aria-label="Secciones del panel">
          {GRUPOS.map((grupo) => {
            const items = delGrupo(grupo.id);
            if (items.length === 0) return null;
            return (
              <div key={grupo.id} className="lateral-grupo">
                <p className="lateral-grupo-titulo">
                  {grupo.id === 'whatsapp' && <IconoWhatsApp />}
                  {grupo.etiqueta}
                  {grupo.id === 'admin' && <span className="solo-admin">Solo admin</span>}
                </p>
                {items.map((item) => (
                  <button
                    key={item.id}
                    className={`lateral-item ${activa === item.id ? 'activo' : ''}`}
                    aria-current={activa === item.id ? 'page' : undefined}
                    onClick={() => elegir(item.id)}
                  >
                    <Icono nombre={item.id as NombreIcono} />
                    {item.etiqueta}
                  </button>
                ))}
              </div>
            );
          })}
        </nav>

        <div className="lateral-cuenta" ref={cuenta}>
          {cuentaAbierta && (
            <div className="menu-cuenta" role="menu" aria-label="Mi cuenta">
              <div className="menu-cuenta-quien">
                <strong>{nombre}</strong>
                {correo && <span className="tenue">{correo}</span>}
              </div>
              <button role="menuitem" onClick={cambiarContrasena}>
                <Icono nombre="llave" />
                Mi contraseña
              </button>
              <button role="menuitem" className="peligro" onClick={onSalir}>
                <Icono nombre="salir" />
                Cerrar sesión
              </button>
            </div>
          )}
          <button
            className={`boton-cuenta ${cuentaAbierta ? 'abierto' : ''}`}
            aria-haspopup="menu"
            aria-expanded={cuentaAbierta}
            onClick={() => setCuentaAbierta(!cuentaAbierta)}
          >
            <span className="avatar" aria-hidden="true">
              {iniciales}
            </span>
            <span className="boton-cuenta-texto">
              <strong>{nombre}</strong>
              {rol && <span className="tenue">{rol}</span>}
            </span>
            <Icono nombre="arriba" tamano={16} />
          </button>
        </div>
      </aside>

      {/* ---------------- Teléfono: barra inferior y hojas ---------------- */}
      <nav className="barra-inferior" aria-label="Secciones">
        {botonFijo('tablero')}
        <BotonDeHoja
          icono="whatsapp"
          etiqueta="WhatsApp"
          activo={hoja === 'whatsapp' || (!hoja && grupoActivo === 'whatsapp')}
          abierta={hoja === 'whatsapp'}
          onClick={() => setHoja(hoja === 'whatsapp' ? null : 'whatsapp')}
        />
        {botonFijo('padron')}
        <BotonDeHoja
          icono="mas"
          etiqueta="Más"
          activo={
            hoja === 'mas' ||
            (!hoja && !!grupoActivo && grupoActivo !== 'whatsapp' && !FIJAS_EN_TELEFONO.includes(activa))
          }
          abierta={hoja === 'mas'}
          onClick={() => setHoja(hoja === 'mas' ? null : 'mas')}
        />
      </nav>

      {hoja && (
        <div className="telon-hoja" onClick={() => setHoja(null)}>
          <div
            className="hoja"
            role="dialog"
            aria-modal="true"
            aria-label={hoja === 'whatsapp' ? 'Para el grupo de WhatsApp' : 'Más opciones'}
            onClick={(evento) => evento.stopPropagation()}
          >
            <div className="hoja-asa" aria-hidden="true" />

            {hoja === 'whatsapp' && (
              <>
                <p className="hoja-intro tenue">
                  Lo que preparas aquí se copia o se comparte en el grupo de WhatsApp.
                </p>
                {delGrupo('whatsapp').map((item) => (
                  <button
                    key={item.id}
                    className={`hoja-tarjeta ${activa === item.id ? 'activo' : ''}`}
                    onClick={() => elegir(item.id)}
                  >
                    <span className="hoja-tarjeta-icono">
                      <Icono nombre={item.id as NombreIcono} tamano={22} />
                    </span>
                    <span className="hoja-tarjeta-texto">
                      <strong>{item.etiqueta}</strong>
                      {item.descripcion && <span className="tenue">{item.descripcion}</span>}
                    </span>
                    <Icono nombre="derecha" />
                  </button>
                ))}
              </>
            )}

            {hoja === 'mas' && (
              <>
                {GRUPOS.filter((grupo) => grupo.id !== 'whatsapp').map((grupo) => {
                  const items = delGrupo(grupo.id).filter(
                    (item) => !FIJAS_EN_TELEFONO.includes(item.id),
                  );
                  if (items.length === 0) return null;
                  return (
                    <div key={grupo.id}>
                      <p className="lateral-grupo-titulo">
                        {grupo.etiqueta}
                        {grupo.id === 'admin' && <span className="solo-admin">Solo admin</span>}
                      </p>
                      <div className="hoja-mosaico">
                        {items.map((item) => (
                          <button
                            key={item.id}
                            className={activa === item.id ? 'activo' : ''}
                            aria-current={activa === item.id ? 'page' : undefined}
                            onClick={() => elegir(item.id)}
                          >
                            <Icono nombre={item.id as NombreIcono} tamano={20} />
                            {item.etiqueta}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}

                <p className="lateral-grupo-titulo">Mi cuenta</p>
                <div className="hoja-cuenta">
                  <div className="hoja-cuenta-quien">
                    <span className="avatar" aria-hidden="true">
                      {iniciales}
                    </span>
                    <span>
                      <strong>{nombre}</strong>
                      <span className="tenue">{[rol, correo].filter(Boolean).join(' · ')}</span>
                    </span>
                  </div>
                  {locations.length > 1 && (
                    <label className="hoja-fila">
                      <Icono nombre="punto" />
                      {selectorDePunto}
                    </label>
                  )}
                  <button className="hoja-fila" onClick={cambiarContrasena}>
                    <Icono nombre="llave" />
                    Mi contraseña
                  </button>
                  <button className="hoja-fila peligro" onClick={onSalir}>
                    <Icono nombre="salir" />
                    Cerrar sesión
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function BotonDeHoja({
  icono,
  etiqueta,
  activo,
  abierta,
  onClick,
}: {
  icono: NombreIcono;
  etiqueta: string;
  activo: boolean;
  abierta: boolean;
  onClick: () => void;
}) {
  return (
    <button className={activo ? 'activo' : ''} aria-haspopup="dialog" aria-expanded={abierta} onClick={onClick}>
      <Icono nombre={abierta ? 'cerrar' : icono} tamano={22} />
      {abierta ? 'Cerrar' : etiqueta}
    </button>
  );
}
