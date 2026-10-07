'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import type { ImportResult } from '@/lib/types';
import { GuiaCampos, type GrupoCampos } from './guia-campos';

type Tipo = 'participants' | 'assignments';

const EJEMPLOS: Record<Tipo, string> = {
  participants:
    'nombre,apellido_paterno,apellido_materno,telefono,rol,congregacion,circuito,ciudad,estado_civil,conyuge\n' +
    'Ana María,López,Pérez,55 1234 5678,participante,Centro,12,Guadalajara,casado,Luis Ramírez\n' +
    'Elena,Mora,,55 9988 7766,encargado,Centro,12,Guadalajara,soltero,',
  assignments: 'telefono,dia,inicio,semana\n55 1234 5678,lunes,7:00,\n55 1234 5678,sabado,9:00,5',
};

const ENCABEZADOS: Record<Tipo, string> = {
  participants:
    'nombre,apellido_paterno,apellido_materno,nombre_a_mostrar,telefono,rol,congregacion,circuito,ciudad,estado_civil,conyuge,conyuge_telefono,alertas,consentimiento',
  assignments: 'telefono,dia,inicio,semana',
};

const AYUDA: Record<Tipo, string> = {
  participants:
    'Da de alta o actualiza a las personas del punto. El teléfono es la clave: si ya existe, la fila ' +
    'actualiza ese registro en lugar de duplicarlo, y las columnas que no traigas se quedan como ' +
    'estaban. Al importar declaras que estas personas ya participan y aceptaron recibir mensajes; ' +
    'sin ese registro el sistema no puede avisarles de ninguna vacante.',
  assignments:
    'Asigna turnos fijos: en qué franja atiende habitualmente cada persona. Las personas deben ' +
    'existir ya en el padrón y la franja debe estar configurada en el punto. También puedes ' +
    'capturarlos uno por uno en la pestaña «Turnos fijos».',
};

/** Las columnas que entiende cada importación, para la guía visual. */
const GRUPOS: Record<Tipo, GrupoCampos[]> = {
  participants: [
    {
      titulo: 'Identificación',
      nota: 'El nombre va en tres columnas separadas, nunca en una sola.',
      campos: [
        {
          nombre: 'nombre',
          alias: ['name'],
          requerido: true,
          que: 'Nombre de pila, sin apellidos. Puede ser compuesto: «Ana María».',
        },
        {
          nombre: 'apellido_paterno',
          alias: ['apellido paterno', 'paternal_surname'],
          requerido: true,
          que: 'Primer apellido. Con él se ordena el padrón.',
        },
        {
          nombre: 'apellido_materno',
          alias: ['apellido materno', 'maternal_surname'],
          que: 'Segundo apellido. Déjalo vacío si no aplica.',
          valores: 'Al reimportar, dejarlo vacío no borra el que ya estaba.',
        },
        {
          nombre: 'nombre_a_mostrar',
          alias: ['nombre a mostrar', 'display_name'],
          que: 'Cómo prefiere que se le nombre en los mensajes.',
          valores: 'Si se deja vacío, los recordatorios saludan por el nombre de pila.',
        },
        {
          nombre: 'telefono',
          alias: ['teléfono', 'phone'],
          requerido: true,
          que: 'El número de WhatsApp. Es lo que identifica a cada persona.',
          valores: (
            <>
              Se acepta con espacios, guiones, lada o prefijo internacional: <code>55 1234 5678</code>,{' '}
              <code>+52 55 1234 5678</code>. Se normaliza solo.
            </>
          ),
        },
      ],
    },
    {
      titulo: 'Participación en el punto',
      campos: [
        {
          nombre: 'rol',
          alias: ['role'],
          que: 'Qué hace esta persona en el punto.',
          valores: (
            <>
              <code>participante</code>, <code>encargado</code> o <code>encargada</code>,{' '}
              <code>admin</code> o <code>administrador</code>. En un alta nueva, vacío ={' '}
              <code>participante</code>; al reimportar, vacío no cambia el rol que ya tenía.
            </>
          ),
        },
        {
          nombre: 'alertas',
          alias: ['alerts'],
          que: 'Si quiere recibir avisos cuando alguien cancela y hay que cubrir.',
          valores: (
            <>
              <code>si</code> o <code>no</code>. En un alta nueva, vacío = <code>si</code>; al
              reimportar, vacío no cambia la preferencia que ya tenía.
            </>
          ),
        },
        {
          nombre: 'consentimiento',
          alias: ['consent'],
          que: 'Si ya aceptó recibir mensajes por WhatsApp.',
          valores: (
            <>
              <code>si</code> o <code>no</code>. Vacío = <code>si</code>. Con <code>no</code> queda
              registrada pero el sistema no le escribe.
            </>
          ),
        },
      ],
    },
    {
      titulo: 'Organización',
      nota: 'Texto libre, para reportes y filtros. Las variantes de la misma grafía se unifican solas.',
      campos: [
        {
          nombre: 'congregacion',
          alias: ['congregación', 'congregation'],
          que: 'Congregación a la que pertenece.',
        },
        { nombre: 'circuito', alias: ['circuit'], que: 'Circuito.' },
        { nombre: 'ciudad', alias: ['city'], que: 'Ciudad.' },
      ],
    },
    {
      titulo: 'Estado civil',
      nota: 'Las columnas de cónyuge solo se aceptan cuando el estado civil es «casado».',
      campos: [
        {
          nombre: 'estado_civil',
          alias: ['estado civil'],
          que: 'Estado civil de la persona.',
          valores: (
            <>
              <code>soltero</code>, <code>casado</code>, <code>viudo</code>, <code>separado</code> o{' '}
              <code>divorciado</code>, en masculino o femenino. <code>divorciado</code> se guarda como{' '}
              «separado». Vacío = sin registrar.
            </>
          ),
        },
        {
          nombre: 'conyuge',
          alias: ['cónyuge', 'spouse'],
          que: 'Nombre del cónyuge cuando no participa en los exhibidores.',
          valores: 'Queda solo como anotación: no crea un registro ni se le envían mensajes.',
        },
        {
          nombre: 'conyuge_telefono',
          alias: ['cónyuge_teléfono', 'spouse_phone'],
          que: 'Teléfono del cónyuge cuando sí es participante.',
          valores:
            'Vincula los dos registros entre sí. El cónyuge puede estar en cualquier fila del mismo archivo.',
        },
      ],
    },
  ],
  assignments: [
    {
      titulo: 'Columnas',
      nota: 'Una fila por cada franja que atiende la persona: si cubre tres franjas, van tres filas.',
      campos: [
        {
          nombre: 'telefono',
          alias: ['teléfono', 'phone'],
          requerido: true,
          que: 'Identifica a la persona. Debe estar ya en el padrón.',
          valores: 'Si el teléfono no existe, la fila falla: importa primero el padrón.',
        },
        {
          nombre: 'dia',
          alias: ['día', 'day'],
          requerido: true,
          que: 'Día de la semana de la franja.',
          valores: (
            <>
              <code>lunes</code>, <code>martes</code>, <code>miercoles</code>, <code>jueves</code>,{' '}
              <code>viernes</code>, <code>sabado</code> o <code>domingo</code>. Con o sin acento.
            </>
          ),
        },
        {
          nombre: 'inicio',
          alias: ['hora', 'start'],
          requerido: true,
          que: 'Hora en que empieza la franja.',
          valores: (
            <>
              <code>7:00</code>, <code>07:00</code> o <code>7</code> a secas; también con minutos,{' '}
              <code>11:30</code>. Tiene que coincidir con una franja configurada en el punto.
            </>
          ),
        },
        {
          nombre: 'semana',
          alias: ['week'],
          que: 'Ordinal de la semana del mes, para las franjas que rotan.',
          valores: (
            <>
              Vacío o <code>0</code> = todas las semanas. <code>1</code> a <code>5</code> para el
              ordinal del mes, como se usa en sábados y domingos.
            </>
          ),
        },
      ],
    },
  ],
};

export function Importar({ locationId }: { locationId: string }) {
  const [tipo, setTipo] = useState<Tipo>('participants');
  const [csv, setCsv] = useState('');
  const [resultado, setResultado] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [avisoArchivo, setAvisoArchivo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function enviar(dryRun: boolean) {
    setBusy(true);
    setError(null);
    setResultado(null);
    try {
      setResultado(
        await api<ImportResult>(`/locations/${locationId}/import/${tipo}`, {
          method: 'POST',
          body: { csv, dryRun },
        }),
      );
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'No se pudo importar');
    } finally {
      setBusy(false);
    }
  }

  /**
   * Lee el archivo detectando su codificación.
   *
   * `readAsText` sin más asume UTF-8, pero Excel en Windows guarda los CSV en
   * Windows-1252: leerlo como UTF-8 convierte cada acento en un carácter
   * ilegible —«Ramón» acaba como «Ram�n»— y eso ya no se puede recuperar
   * después, porque el dato llega corrompido al servidor.
   *
   * Se intenta UTF-8 en modo estricto: si el archivo trae bytes que no son UTF-8
   * válido, el decodificador falla y entonces se sabe que es Windows-1252.
   */
  async function leerArchivo(event: React.ChangeEvent<HTMLInputElement>) {
    const archivo = event.target.files?.[0];
    if (!archivo) return;

    setError(null);
    try {
      const bytes = await archivo.arrayBuffer();
      let texto: string;
      let codificacion = 'UTF-8';

      try {
        texto = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      } catch {
        texto = new TextDecoder('windows-1252').decode(bytes);
        codificacion = 'Windows-1252';
      }

      setCsv(texto);
      setAvisoArchivo(
        `${archivo.name} · ${codificacion}` +
          (codificacion === 'UTF-8' ? '' : ' · los acentos se convirtieron a UTF-8'),
      );
    } catch {
      setError('No se pudo leer el archivo. Vuelve a seleccionarlo.');
    }
  }

  return (
    <section>
      {error && <div className="aviso error">{error}</div>}

      <div className="tarjeta">
        <label>
          <span>¿Qué vas a importar?</span>
          <select
            value={tipo}
            onChange={(e) => {
              setTipo(e.target.value as Tipo);
              setResultado(null);
            }}
          >
            <option value="participants">Padrón de participantes</option>
            <option value="assignments">Asignaciones fijas (turnos habituales)</option>
          </select>
        </label>

        <p className="tenue">{AYUDA[tipo]}</p>

        <GuiaCampos grupos={GRUPOS[tipo]} encabezado={ENCABEZADOS[tipo]} />

        <label style={{ marginTop: '1rem' }}>
          <span>Archivo CSV</span>
          <input
            type="file"
            accept=".csv,text/csv,text/plain"
            onChange={(evento) => void leerArchivo(evento)}
          />
          {avisoArchivo && (
            <span className="tenue" style={{ marginTop: '0.2rem' }}>
              {avisoArchivo}
            </span>
          )}
        </label>

        <label>
          <span>Contenido</span>
          <textarea
            rows={10}
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            placeholder={EJEMPLOS[tipo]}
          />
        </label>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => void enviar(true)} disabled={busy || !csv.trim()}>
            Validar sin guardar
          </button>
          <button className="primario" onClick={() => void enviar(false)} disabled={busy || !csv.trim()}>
            Importar
          </button>
        </div>
      </div>

      {resultado && (
        <div className="tarjeta" style={{ marginTop: '1rem' }}>
          <h3>{resultado.dryRun ? 'Validación (no se guardó nada)' : 'Importación realizada'}</h3>
          <p>
            {resultado.processed} fila(s) procesada(s) · {resultado.created} nueva(s) ·{' '}
            {resultado.updated} actualizada(s) · {resultado.errors.length} con error
          </p>

          {resultado.errors.length > 0 && (
            <>
              <div className="aviso atencion">
                Corrige estas filas y vuelve a intentar. Las demás {resultado.dryRun ? 'se importarían' : 'ya se importaron'}.
              </div>
              <table>
                <thead>
                  <tr>
                    <th className="numero" style={{ width: 70 }}>Fila</th>
                    <th>Registro</th>
                    <th>Problema</th>
                  </tr>
                </thead>
                <tbody>
                  {resultado.errors.map((problema) => (
                    <tr key={`${problema.row}-${problema.message}`}>
                      <td className="numero">{problema.row}</td>
                      <td>{problema.label ?? <span className="tenue">—</span>}</td>
                      <td>{problema.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}
    </section>
  );
}
