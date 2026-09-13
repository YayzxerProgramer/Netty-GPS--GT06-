/**
 * Piezas compartidas por las vistas del panel: modal, paginación, campos de
 * formulario y formateadores. Sin esto, las cuatro vistas repetirían el mismo
 * markup y se desincronizarían al primer retoque de diseño.
 */
import NavIcon from "./Iconos";
import { numero } from "./formato";

export function Aviso({ texto, tipo = "error", alCerrar }) {
  if (!texto) return null;
  return (
    <div className={`aviso aviso-${tipo}`}>
      <span>{texto}</span>
      {alCerrar && (
        <button className="aviso-cerrar" onClick={alCerrar} aria-label="Cerrar aviso">
          <NavIcon type="close" size={14} />
        </button>
      )}
    </div>
  );
}

export function Cargando({ texto = "Cargando..." }) {
  return <div className="estado-vacio"><div className="spinner" />{texto}</div>;
}

export function Vacio({ texto }) {
  return <div className="estado-vacio">{texto}</div>;
}

export function Paginacion({ pagina, totalPaginas, totalElementos, alCambiar }) {
  if (totalPaginas <= 1) return null;
  return (
    <div className="paginacion">
      <span className="paginacion-info">
        {numero(totalElementos)} registros · página {pagina + 1} de {totalPaginas}
      </span>
      <div className="paginacion-botones">
        <button disabled={pagina === 0} onClick={() => alCambiar(pagina - 1)}>Anterior</button>
        <button disabled={pagina >= totalPaginas - 1} onClick={() => alCambiar(pagina + 1)}>Siguiente</button>
      </div>
    </div>
  );
}

export function Modal({ titulo, descripcion, alCerrar, children }) {
  return (
    <div className="modal-fondo" onClick={alCerrar}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-titulo">{titulo}</div>
            {descripcion && <div className="modal-desc">{descripcion}</div>}
          </div>
          <button className="icon-btn" onClick={alCerrar} aria-label="Cerrar">
            <NavIcon type="close" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Campo({ etiqueta, error, children }) {
  return (
    <label className="campo">
      <span className="campo-etiqueta">{etiqueta}</span>
      {children}
      {error && <span className="campo-error">{error}</span>}
    </label>
  );
}

export function Insignia({ activo, textoActivo = "ACTIVO", textoInactivo = "INACTIVO" }) {
  return (
    <div className="status-badge">
      <div className={`status-dot ${activo ? "operational" : ""}`} />
      <span className="status-op">{activo ? textoActivo : textoInactivo}</span>
    </div>
  );
}
