import { cloneElement, isValidElement, useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { get } from "../../Service/api";
import { contar, iniciales, nombreCompleto, query } from "./adminUtils";
import { ContextoAvisos } from "./avisos";

/* ── Avisos (toasts) ─────────────────────────────────────────── */

export function ProveedorAvisos({ children }) {
  const [avisos, setAvisos] = useState([]);

  const avisar = useCallback((texto, tipo = "ok") => {
    const id = Math.random().toString(36).slice(2);
    setAvisos((prev) => [...prev, { id, texto, tipo }]);
    setTimeout(() => setAvisos((prev) => prev.filter((a) => a.id !== id)), 4200);
  }, []);

  return (
    <ContextoAvisos.Provider value={avisar}>
      {children}
      {createPortal(
        <div className="adm-capa adm-avisos" role="status" aria-live="polite">
          {avisos.map((a) => (
            <div key={a.id} className={`adm-aviso adm-aviso--${a.tipo}`}>
              <span className="material-symbols-outlined">{a.tipo === "error" ? "error" : "check_circle"}</span>
              {a.texto}
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ContextoAvisos.Provider>
  );
}

/* ── Modal ───────────────────────────────────────────────────── */

/**
 * Se monta en <body> con un portal: dentro de una tarjeta con backdrop-filter
 * un position:fixed queda atrapado en la tarjeta en vez de cubrir la pantalla.
 * La clase adm-capa vuelve a declarar los tokens de color del panel.
 */
export function Modal({ titulo, subtitulo, icono, onCerrar, children, pie, ancho = 520 }) {
  useEffect(() => {
    const alPulsar = (e) => { if (e.key === "Escape") onCerrar(); };
    window.addEventListener("keydown", alPulsar);
    document.body.classList.add("sin-scroll");
    return () => {
      window.removeEventListener("keydown", alPulsar);
      document.body.classList.remove("sin-scroll");
    };
  }, [onCerrar]);

  return createPortal(
    <div className="adm-capa adm-modal-velo" onMouseDown={onCerrar}>
      <div
        className="adm-modal"
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        style={{ maxWidth: ancho }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="adm-modal-cab">
          {icono && <span className="adm-modal-icono"><span className="material-symbols-outlined">{icono}</span></span>}
          <div className="adm-modal-titulos">
            <div className="adm-modal-titulo">{titulo}</div>
            {subtitulo && <div className="adm-modal-sub">{subtitulo}</div>}
          </div>
          <button type="button" className="adm-icono-btn adm-icono-btn--sm" aria-label="Cerrar" onClick={onCerrar}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="adm-modal-cuerpo">{children}</div>
        {pie && <div className="adm-modal-pie">{pie}</div>}
      </div>
    </div>,
    document.body,
  );
}

/** Confirmación con su propio estado de carga y error. */
export function Confirmar({ titulo, mensaje, textoConfirmar = "Confirmar", peligro = false, icono, onConfirmar, onCerrar }) {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  const confirmar = async () => {
    setEnviando(true);
    setError(null);
    try {
      await onConfirmar();
      onCerrar();
    } catch (e) {
      setError(e.message || "No se pudo completar la operación");
      setEnviando(false);
    }
  };

  return (
    <Modal
      titulo={titulo}
      icono={icono || (peligro ? "warning" : "help")}
      onCerrar={onCerrar}
      ancho={440}
      pie={(
        <>
          <button type="button" className="adm-btn-fantasma" onClick={onCerrar}>Cancelar</button>
          <button
            type="button"
            className={peligro ? "adm-btn-peligro" : "adm-btn-primario"}
            onClick={confirmar}
            disabled={enviando}
          >
            {enviando ? "Procesando…" : textoConfirmar}
          </button>
        </>
      )}
    >
      <p className="adm-modal-texto">{mensaje}</p>
      {error && <div className="adm-error adm-error--sm"><span className="material-symbols-outlined">error</span>{error}</div>}
    </Modal>
  );
}

/* ── Formularios ─────────────────────────────────────────────── */

/**
 * Solo los controles nativos se asocian a la etiqueta. Un <label> que envuelve
 * botones (segmentos, selector) los dispara al pulsar el texto.
 */
export function Campo({ etiqueta, error, ayuda, children, ancho }) {
  const id = useId();
  const nativo = isValidElement(children) && ["input", "select", "textarea"].includes(children.type);
  return (
    <div className={`adm-campo ${ancho ? "adm-campo--ancho" : ""}`}>
      {nativo
        ? <label className="adm-campo-etiqueta" htmlFor={id}>{etiqueta}</label>
        : <span className="adm-campo-etiqueta">{etiqueta}</span>}
      {nativo ? cloneElement(children, { id, "aria-invalid": Boolean(error) }) : children}
      {error ? <span className="adm-campo-error">{error}</span> : ayuda && <span className="adm-campo-ayuda">{ayuda}</span>}
    </div>
  );
}

/** Grupo de botones excluyentes (tipo, rol, filtros). */
export function Segmentos({ opciones, valor, onCambiar, pequeno }) {
  return (
    <div className={`adm-segmentos ${pequeno ? "adm-segmentos--sm" : ""}`} role="radiogroup">
      {opciones.map((o) => (
        <button
          key={String(o.valor)}
          type="button"
          role="radio"
          aria-checked={valor === o.valor}
          className={valor === o.valor ? "activo" : ""}
          onClick={() => onCambiar(o.valor)}
        >
          {o.icono && <span className="material-symbols-outlined">{o.icono}</span>}
          {o.etiqueta}
        </button>
      ))}
    </div>
  );
}

/* ── Paginación ──────────────────────────────────────────────── */

export function Paginacion({ pagina, totalPaginas, totalElementos, onCambiar, singular = "registro", plural }) {
  if (!totalElementos) return null;
  return (
    <div className="adm-paginacion">
      <span>{contar(totalElementos, singular, plural)}</span>
      <div className="adm-paginacion-botones">
        <button type="button" className="adm-icono-btn adm-icono-btn--sm" disabled={pagina <= 0} onClick={() => onCambiar(pagina - 1)} aria-label="Página anterior">
          <span className="material-symbols-outlined">chevron_left</span>
        </button>
        <span className="adm-paginacion-num">{pagina + 1} / {Math.max(totalPaginas, 1)}</span>
        <button type="button" className="adm-icono-btn adm-icono-btn--sm" disabled={pagina >= totalPaginas - 1} onClick={() => onCambiar(pagina + 1)} aria-label="Página siguiente">
          <span className="material-symbols-outlined">chevron_right</span>
        </button>
      </div>
    </div>
  );
}

/* ── Selector de usuario con búsqueda ────────────────────────── */

export function SelectorUsuario({ valor, onCambiar, permitirNinguno = true }) {
  const [texto, setTexto] = useState("");
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const peticion = useRef(0);

  useEffect(() => {
    const id = setTimeout(async () => {
      const n = ++peticion.current;
      setBuscando(true);
      try {
        const pag = await get(`/admin/usuarios${query({ busqueda: texto, tamano: 6, ordenarPor: "nombre", direccion: "ASC" })}`);
        if (n === peticion.current) setResultados(pag.contenido);
      } catch {
        if (n === peticion.current) setResultados([]);
      } finally {
        if (n === peticion.current) setBuscando(false);
      }
    }, 300);
    return () => clearTimeout(id);
  }, [texto]);

  if (valor) {
    return (
      <div className="adm-selector-elegido">
        <span className="adm-iniciales">{iniciales(nombreCompleto(valor))}</span>
        <span className="adm-selector-texto">
          <b>{nombreCompleto(valor)}</b>
          <span>@{valor.usuario} · {valor.correo}</span>
        </span>
        <button type="button" className="adm-btn-fila" onClick={() => onCambiar(null)}>Cambiar</button>
      </div>
    );
  }

  return (
    <div className="adm-selector">
      <div className="adm-entrada adm-entrada--icono">
        <span className="material-symbols-outlined">person_search</span>
        <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Buscar por nombre, usuario o correo…" />
      </div>
      <div className="adm-selector-lista">
        {buscando && resultados.length === 0 && <div className="adm-selector-vacio">Buscando…</div>}
        {!buscando && resultados.length === 0 && <div className="adm-selector-vacio">Sin coincidencias</div>}
        {resultados.map((u) => (
          <button type="button" key={u.id} className="adm-selector-item" onClick={() => onCambiar(u)}>
            <span className="adm-iniciales">{iniciales(nombreCompleto(u))}</span>
            <span className="adm-selector-texto">
              <b>{nombreCompleto(u)}</b>
              <span>@{u.usuario} · {u.correo}</span>
            </span>
          </button>
        ))}
      </div>
      {permitirNinguno && <div className="adm-campo-ayuda">Puedes dejarlo sin propietario y vincularlo más tarde.</div>}
    </div>
  );
}

/* ── Insignias ───────────────────────────────────────────────── */

export function InsigniaEstado({ estado, texto }) {
  return (
    <span className={`adm-estado adm-estado--${estado}`}>
      <span className="adm-estado-punto" />{texto}
    </span>
  );
}

export function Vacio({ icono = "inbox", titulo, texto, accion }) {
  return (
    <div className="adm-vacio">
      <span className="material-symbols-outlined">{icono}</span>
      <b>{titulo}</b>
      {texto && <p>{texto}</p>}
      {accion}
    </div>
  );
}
