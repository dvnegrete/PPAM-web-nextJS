'use client';

/**
 * Lo que se ve si una sección no llega a cargarse ni después de recargar el
 * panel. Sin esto Next muestra su pantalla genérica en inglés.
 */
export default function PanelError() {
  return (
    <div className="panel">
      <div className="aviso error">
        No se pudo cargar esta parte del panel. Revisa tu conexión y vuelve a intentarlo.
      </div>
      <button className="primario" onClick={() => window.location.reload()}>
        Recargar
      </button>
    </div>
  );
}
