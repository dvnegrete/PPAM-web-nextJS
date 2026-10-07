'use client';

import { ReactNode, useState } from 'react';

export interface Campo {
  nombre: string;
  /** Otros encabezados que el importador reconoce para la misma columna. */
  alias?: string[];
  requerido?: boolean;
  que: string;
  /** Valores aceptados o formato esperado, cuando no es texto libre. */
  valores?: ReactNode;
}

export interface GrupoCampos {
  titulo: string;
  nota?: string;
  campos: Campo[];
}

/**
 * Guía visual de las columnas que acepta el archivo.
 *
 * Sin ella, la única forma de conocer el formato es equivocarse y leer el
 * error: el importador reconoce varios nombres para la misma columna y acepta
 * valores concretos en el rol, el estado civil y el día, y nada de eso se
 * adivina desde una hoja de cálculo vacía.
 *
 * Lo requerido se marca y se nombra, no solo se colorea: el color por sí solo no
 * dice nada a quien no distingue los tonos.
 */
export function GuiaCampos({
  grupos,
  encabezado,
}: {
  grupos: GrupoCampos[];
  encabezado: string;
}) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(encabezado);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  }

  const requeridos = grupos.flatMap((grupo) => grupo.campos).filter((campo) => campo.requerido);

  return (
    <details className="guia-campos">
      <summary>Ver qué columnas puede tener el archivo</summary>

      <p className="tenue" style={{ marginTop: '0.6rem' }}>
        El orden de las columnas no importa y puedes omitir las opcionales. Lo único obligatorio es{' '}
        {requeridos.map((campo, indice) => (
          <span key={campo.nombre}>
            {indice > 0 && (indice === requeridos.length - 1 ? ' y ' : ', ')}
            <code>{campo.nombre}</code>
          </span>
        ))}
        . El separador puede ser coma, punto y coma o tabulador, y los acentos se detectan solos.
      </p>

      <p className="tenue">
        Puedes volver a subir el archivo cuando quieras: las filas cuyo teléfono ya existe actualizan
        ese registro en lugar de duplicarlo, y las columnas <strong>opcionales</strong> que no traigas
        —o que vengan vacías— dejan intacto lo que ya estaba. Las obligatorias sí hacen falta en todas
        las filas, también al actualizar: una fila sin ellas se rechaza.
      </p>

      <p className="tenue">
        Para <strong>borrar</strong> un dato o <strong>cambiar un teléfono</strong>, usa el botón
        «Editar» del Padrón: por CSV, un teléfono distinto se toma como otra persona.
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button onClick={() => void copiar()}>
          {copiado ? 'Copiado ✓' : 'Copiar fila de encabezado'}
        </button>
        <span className="tenue">Pégala en la primera fila de tu hoja de cálculo.</span>
      </div>

      {grupos.map((grupo) => (
        <div className="grupo-campos" key={grupo.titulo}>
          <h4>{grupo.titulo}</h4>
          {grupo.nota && <p className="tenue">{grupo.nota}</p>}
          <div className="campos">
            {grupo.campos.map((campo) => (
              <div
                className={`campo ${campo.requerido ? 'requerido' : 'opcional'}`}
                key={campo.nombre}
              >
                <div>
                  <code>{campo.nombre}</code>
                  <br />
                  <span className={`etiqueta ${campo.requerido ? 'critico' : ''}`}>
                    {campo.requerido ? 'Obligatorio' : 'Opcional'}
                  </span>
                </div>
                <div>
                  <span className="que">{campo.que}</span>
                  {campo.alias && campo.alias.length > 0 && (
                    <>
                      <br />
                      <span className="alias">También acepta: {campo.alias.join(', ')}</span>
                    </>
                  )}
                </div>
                {campo.valores && <span className="valores">{campo.valores}</span>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </details>
  );
}
