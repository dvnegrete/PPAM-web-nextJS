'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { fechaCorta } from '@/lib/horas';
import type { AnnounceResult, ConfirmationRow, ConfirmationsDraft } from '@/lib/types';
import { BotonCopiar } from './boton-copiar';
import { ConfirmarPublicado } from './confirmar-publicado';

/** Lo que se recuerda de una copia que nadie confirmó todavía. */
interface CopiaPendiente {
  at: string;
  keys: string[];
}

function claveDeMemoria(locationId: string): string {
  return `confirmaciones-pendientes:${locationId}`;
}

/**
 * El aviso de copia sin confirmar vive en el navegador de quien copió.
 *
 * No va al servidor a propósito: lo que importa guardar allá es lo que **sí** se
 * publicó, y una copia a medias no es un hecho del punto, es un recordatorio
 * personal. Todo en `try/catch` porque en una ventana privada `localStorage`
 * puede lanzar, y entonces simplemente no hay aviso.
 */
function leerPendiente(locationId: string): CopiaPendiente | null {
  try {
    const crudo = window.localStorage.getItem(claveDeMemoria(locationId));
    if (!crudo) return null;
    const dato = JSON.parse(crudo) as CopiaPendiente;
    return Array.isArray(dato.keys) && typeof dato.at === 'string' ? dato : null;
  } catch {
    return null;
  }
}

function guardarPendiente(locationId: string, pendiente: CopiaPendiente | null): void {
  try {
    if (pendiente) {
      window.localStorage.setItem(claveDeMemoria(locationId), JSON.stringify(pendiente));
    } else {
      window.localStorage.removeItem(claveDeMemoria(locationId));
    }
  } catch {
    // Sin memoria disponible no hay aviso, y no pasa nada más.
  }
}

/** «hace 12 minutos», para que el aviso diga algo útil y no una hora exacta. */
function haceCuanto(iso: string): string {
  const minutos = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutos < 1) return 'hace un momento';
  if (minutos === 1) return 'hace un minuto';
  if (minutos < 60) return `hace ${minutos} minutos`;
  const horas = Math.round(minutos / 60);
  return horas === 1 ? 'hace una hora' : `hace ${horas} horas`;
}

/** «A», «A y B», «A, B y C». */
function enumerar(partes: string[]): string {
  if (partes.length <= 1) return partes.join('');
  return `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`;
}

/**
 * El mensaje con las filas que quedan.
 *
 * El servidor redacta el mismo texto —y es el que manda para las pruebas—, pero
 * aquí hay que rearmarlo al quitar una línea para que se vea al instante lo que
 * se va a pegar. Los horarios **no** se vuelven a formatear: se usan tal como
 * llegan en cada fila, así que el formato sigue decidiéndose en un solo sitio.
 */
function armarTexto(filas: ConfirmationRow[]): string {
  if (filas.length === 0) return 'No hay confirmaciones pendientes de publicar.';

  const porTurno = new Map<string, ConfirmationRow[]>();
  for (const fila of filas) {
    const grupo = porTurno.get(fila.shiftId);
    if (grupo) grupo.push(fila);
    else porTurno.set(fila.shiftId, [fila]);
  }

  const encabezado =
    porTurno.size === 1
      ? 'Confirmamos el siguiente horario:'
      : 'Confirmamos los siguientes horarios:';

  const lineas = [...porTurno.values()].map((grupo) => {
    const nombres = enumerar(grupo.map((fila) => `[${fila.name}]`));
    return `- ${grupo[0].dayLabel} de ${grupo[0].range}: ${nombres}`;
  });

  return `${encabezado}\n${lineas.join('\n')}`;
}

/**
 * El mensaje con el que se confirma en el grupo a quien va a cubrir un turno.
 *
 * Mientras no haya API de WhatsApp lo pega un encargado a mano, así que esta
 * pantalla hace tres cosas: redactarlo, dejar quitar la línea que no se quiera
 * publicar, y —solo cuando el encargado lo confirma— anotar a quién ya se le
 * avisó, para que no vuelva a salir en el mensaje siguiente.
 */
export function Confirmaciones({ locationId }: { locationId: string }) {
  const [borrador, setBorrador] = useState<ConfirmationsDraft | null>(null);
  // Quitadas de **este** mensaje. No se guardan: la próxima vez vuelven a
  // ofrecerse, porque quitar una línea no es decidir nada sobre el turno.
  const [quitadas, setQuitadas] = useState<Set<string>>(new Set());
  const [enDialogo, setEnDialogo] = useState<ConfirmationRow[] | null>(null);
  const [pendiente, setPendiente] = useState<CopiaPendiente | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const datos = await api<ConfirmationsDraft>(
        `/locations/${locationId}/confirmations-draft`,
      );
      setBorrador(datos);
      setQuitadas(new Set());

      // Un pendiente cuyas confirmaciones ya no están en la lista es un
      // pendiente resuelto: alguien las marcó, aquí o desde otro teléfono.
      const guardado = leerPendiente(locationId);
      const vivas = guardado?.keys.filter((key) =>
        datos.rows.some((fila) => fila.key === key),
      );
      if (guardado && vivas && vivas.length > 0) {
        setPendiente({ at: guardado.at, keys: vivas });
      } else {
        setPendiente(null);
        if (guardado) guardarPendiente(locationId, null);
      }
    } catch (problema) {
      setError(problema instanceof Error ? problema.message : 'No se pudieron cargar');
    } finally {
      setCargando(false);
    }
  }, [locationId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const filas = (borrador?.rows ?? []).filter((fila) => !quitadas.has(fila.key));
  const texto = armarTexto(filas);

  function alCopiar() {
    const copia = { at: new Date().toISOString(), keys: filas.map((fila) => fila.key) };
    guardarPendiente(locationId, copia);
    setPendiente(copia);
    setEnDialogo(filas);
  }

  /** Desde el aviso, el diálogo pregunta por lo que se copió, no por lo de ahora. */
  function abrirDesdePendiente() {
    const delPendiente = (borrador?.rows ?? []).filter((fila) =>
      pendiente?.keys.includes(fila.key),
    );
    setEnDialogo(delPendiente.length > 0 ? delPendiente : filas);
  }

  async function confirmar(keys: string[]) {
    const resultado = await api<AnnounceResult>(
      `/locations/${locationId}/confirmations/announced`,
      { method: 'POST', body: { keys } },
    );

    setEnDialogo(null);
    guardarPendiente(locationId, null);
    setPendiente(null);
    setBorrador(resultado.draft);
    setQuitadas(new Set());

    const cuantas = resultado.announced.length;
    const repetidas = resultado.alreadyAnnounced.length;
    setAviso(
      [
        cuantas === 1
          ? 'Queda anotada 1 confirmación como publicada.'
          : `Quedan anotadas ${cuantas} confirmaciones como publicadas.`,
        repetidas > 0
          ? repetidas === 1
            ? 'Otra persona ya había marcado 1 de las que elegiste.'
            : `Otra persona ya había marcado ${repetidas} de las que elegiste.`
          : '',
      ]
        .filter(Boolean)
        .join(' '),
    );
  }

  if (cargando && !borrador) {
    return <p className="tenue">{error ?? 'Cargando…'}</p>;
  }

  return (
    <section>
      {error && <div className="aviso error">{error}</div>}
      {aviso && <div className="aviso exito">{aviso}</div>}

      {pendiente && (borrador?.rows.length ?? 0) > 0 && (
        <div className="aviso atencion">
          Copiaste este mensaje {haceCuanto(pendiente.at)} y no confirmaste que lo publicaste.
          <div className="atajos" style={{ marginTop: '0.6rem' }}>
            <button onClick={abrirDesdePendiente}>Ya lo publiqué</button>
            <button
              onClick={() => {
                guardarPendiente(locationId, null);
                setPendiente(null);
              }}
            >
              Descartar aviso
            </button>
          </div>
        </div>
      )}

      <div className="tarjeta" style={{ marginBottom: '1rem' }}>
        <h3>Confirmaciones por publicar</h3>
        <p className="tenue">
          Quienes se ofrecieron a cubrir un turno y todavía no han salido en ningún mensaje del
          grupo. Copiar no marca nada: después de pegarlo, el sistema pregunta si ya se publicó.
        </p>

        {borrador && borrador.rows.length === 0 ? (
          <div className="aviso exito" style={{ marginBottom: 0 }}>
            No hay nadie pendiente de confirmación. Al registrar una cobertura en el tablero,
            aparecerá aquí.
          </div>
        ) : (
          <>
            <ul className="personas">
              {(borrador?.rows ?? []).map((fila) => {
                const quitada = quitadas.has(fila.key);
                return (
                  <li key={fila.key} className={quitada ? 'baja' : undefined}>
                    <span className="nombre">{fila.name}</span>
                    <span className="tenue detalle">
                      {fila.dayLabel} de {fila.range}
                      {fila.assignedAt && ` · registrado el ${fechaCorta(fila.assignedAt)}`}
                      {fila.assignedByName && ` por ${fila.assignedByName}`}
                    </span>
                    <button
                      className="accion"
                      onClick={() =>
                        setQuitadas((previas) => {
                          const siguiente = new Set(previas);
                          if (quitada) siguiente.delete(fila.key);
                          else siguiente.add(fila.key);
                          return siguiente;
                        })
                      }
                    >
                      {quitada ? 'Devolver' : 'Quitar'}
                    </button>
                  </li>
                );
              })}
            </ul>

            {quitadas.size > 0 && (
              <p className="tenue" style={{ marginTop: '0.7rem' }}>
                Lo quitado solo sale de este mensaje; no cambia nada del turno y volverá a
                ofrecerse la próxima vez.
              </p>
            )}
          </>
        )}
      </div>

      {filas.length > 0 && (
        <div className="tarjeta">
          <h3>Mensaje para el grupo</h3>
          <pre className="bloque">{texto}</pre>

          <p className="tenue">
            Cada <strong>[nombre completo]</strong> es el lugar donde hay que etiquetar a la
            persona: bórralo, teclea <code>@</code> y elígela del menú de WhatsApp. El sistema no
            puede hacerlo por ti —la etiqueta depende de cómo tengas guardado a cada quien en tu
            teléfono—, y por eso va el nombre completo: para que no quede duda de a cuál de dos
            participantes parecidos etiquetar.
          </p>

          <div className="atajos">
            <BotonCopiar
              texto={texto}
              etiqueta="Copiar mensaje"
              principal
              onCopiado={alCopiar}
            />
            <button onClick={() => setEnDialogo(filas)}>Ya lo publiqué</button>
          </div>
        </div>
      )}

      {enDialogo && (
        <ConfirmarPublicado
          filas={enDialogo}
          onConfirmar={confirmar}
          onCerrar={() => setEnDialogo(null)}
        />
      )}
    </section>
  );
}
