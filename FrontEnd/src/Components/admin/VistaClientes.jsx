/**
 * Client Registry — gestión de usuarios.
 *
 * El enlace de la barra lateral existía pero no renderizaba nada: solo movía
 * el resaltado. Esta vista cubre el CRUD que el backend ya exponía en
 * /admin/usuarios y que no tenía interfaz.
 */
import { useState, useEffect, useCallback } from "react";
import { get, post, put, patch, del } from "../../Service/api";
import { obtenerUsuario } from "../../Service/sesion";
import NavIcon from "./Iconos";
import { Aviso, Cargando, Vacio, Paginacion, Modal, Campo, Insignia } from "./Comunes";
import { fecha } from "./formato";

const ROLES = ["ADMIN", "USER", "VIEWER"];

const FORMULARIO_VACIO = {
  nombre: "", apellido: "", usuario: "", contrasena: "",
  correo: "", telefono: "", rol: "USER", activo: true,
};

export default function VistaClientes({ busqueda }) {
  const yo = obtenerUsuario();

  const [pagina, setPagina] = useState(0);
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);

  const [filtroRol, setFiltroRol] = useState("");
  const [filtroActivo, setFiltroActivo] = useState("");

  const [modal, setModal] = useState(null);
  const [formulario, setFormulario] = useState(FORMULARIO_VACIO);
  const [guardando, setGuardando] = useState(false);

  // Al cambiar la búsqueda o un filtro hay que volver a la primera página:
  // si estabas en la 3 y el filtro nuevo devuelve una sola, quedaba vacía.
  // Se compara con el valor anterior durante el render —el patrón que React
  // recomienda para derivar estado— en lugar de un efecto, que provocaría
  // un render de más.
  const criterios = `${busqueda}|${filtroRol}|${filtroActivo}`;
  const [criteriosPrevios, setCriteriosPrevios] = useState(criterios);
  if (criterios !== criteriosPrevios) {
    setCriteriosPrevios(criterios);
    setPagina(0);
  }

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const parametros = new URLSearchParams({ pagina: String(pagina), tamano: "12" });
      if (busqueda) parametros.set("busqueda", busqueda);
      if (filtroRol) parametros.set("rol", filtroRol);
      if (filtroActivo) parametros.set("activo", filtroActivo);
      setDatos(await get(`/admin/usuarios?${parametros}`));
    } catch (e) {
      setError(e.message || "No se pudieron cargar los usuarios");
    } finally {
      setCargando(false);
    }
  }, [pagina, busqueda, filtroRol, filtroActivo]);

  // La espera de 300 ms evita una petición por cada tecla del buscador, y
  // mantiene el setState fuera del cuerpo síncrono del efecto, que dispara
  // renders en cascada.
  useEffect(() => {
    const id = setTimeout(cargar, 300);
    return () => clearTimeout(id);
  }, [cargar]);

  const conAviso = async (accion, mensaje) => {
    setError(null);
    try {
      await accion();
      setExito(mensaje);
      setTimeout(() => setExito(null), 3000);
      cargar();
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    }
  };

  const abrirCrear = () => { setFormulario(FORMULARIO_VACIO); setModal({ tipo: "crear" }); };

  const abrirEditar = (u) => {
    setFormulario({
      nombre: u.nombre || "", apellido: u.apellido || "", usuario: u.usuario || "",
      correo: u.correo || "", telefono: u.telefono || "", contrasena: "",
      rol: u.rol, activo: u.activo,
    });
    setModal({ tipo: "editar", usuario: u });
  };

  const guardar = async (evento) => {
    evento.preventDefault();
    setGuardando(true);
    const esCrear = modal.tipo === "crear";
    const ok = await conAviso(async () => {
      if (esCrear) {
        await post("/admin/usuarios", formulario);
      } else {
        const { nombre, apellido, usuario, correo, telefono } = formulario;
        await put(`/admin/usuarios/${modal.usuario.id}`, { nombre, apellido, usuario, correo, telefono });
      }
    }, esCrear ? "Usuario creado" : "Usuario actualizado");
    setGuardando(false);
    if (ok) setModal(null);
  };

  const guardarContrasena = async (evento) => {
    evento.preventDefault();
    setGuardando(true);
    const ok = await conAviso(
      () => patch(`/admin/usuarios/${modal.usuario.id}/contrasena`, { nuevaContrasena: formulario.contrasena }),
      "Contraseña restablecida",
    );
    setGuardando(false);
    if (ok) setModal(null);
  };

  const cambiarRol = (u, rol) =>
    conAviso(() => patch(`/admin/usuarios/${u.id}/rol`, { rol }), `Rol de ${u.usuario} cambiado a ${rol}`);

  const alternarEstado = (u) =>
    conAviso(() => patch(`/admin/usuarios/${u.id}/estado`), `${u.usuario} ${u.activo ? "desactivado" : "activado"}`);

  const eliminar = async () => {
    const ok = await conAviso(() => del(`/admin/usuarios/${modal.usuario.id}`), "Usuario eliminado");
    if (ok) setModal(null);
  };

  const usuarios = datos?.contenido || [];
  const columnas = "200px 200px 120px 110px 120px 1fr";

  return (
    <>
      <div className="page-header">
        <div className="header-row">
          <div>
            <h1 className="page-title">Client Registry</h1>
            <p className="page-desc">Altas, roles y acceso de los usuarios del sistema.</p>
          </div>
          <div className="header-meta">
            <div className="meta-item">
              <label>REGISTRADOS</label>
              <span>{datos?.totalElementos ?? 0}</span>
            </div>
          </div>
        </div>
      </div>

      <Aviso texto={error} alCerrar={() => setError(null)} />
      <Aviso texto={exito} tipo="exito" alCerrar={() => setExito(null)} />

      <div className="barra-acciones">
        <div className="filtros">
          <select value={filtroRol} onChange={(e) => setFiltroRol(e.target.value)}>
            <option value="">Todos los roles</option>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <select value={filtroActivo} onChange={(e) => setFiltroActivo(e.target.value)}>
            <option value="">Cualquier estado</option>
            <option value="true">Solo activos</option>
            <option value="false">Solo inactivos</option>
          </select>
          <button className="btn-plano" onClick={cargar}><NavIcon type="refresh" size={14} /> Recargar</button>
        </div>
        <button className="export-btn" onClick={abrirCrear}>
          <NavIcon type="plus" /> Nuevo usuario
        </button>
      </div>

      <div className="deployments">
        <div className="table-header" style={{ gridTemplateColumns: columnas }}>
          <span>USUARIO</span>
          <span>CONTACTO</span>
          <span>ROL</span>
          <span>ESTADO</span>
          <span>ALTA</span>
          <span>ACCIONES</span>
        </div>

        {cargando && <Cargando />}
        {!cargando && usuarios.length === 0 && (
          <Vacio texto={busqueda ? "Sin resultados para la búsqueda" : "No hay usuarios registrados"} />
        )}

        {!cargando && usuarios.map((u) => {
          const nombre = `${u.nombre} ${u.apellido || ""}`.trim();
          const esYo = u.usuario === yo;
          return (
            <div key={u.id} className="table-row" style={{ gridTemplateColumns: columnas }}>
              <div className="client-cell">
                <div className="client-avatar">{(nombre || u.usuario).slice(0, 2).toUpperCase()}</div>
                <div>
                  <div className="device-id">{u.usuario}{esYo && <span className="etiqueta-tu">TÚ</span>}</div>
                  <div className="device-type">{nombre || "—"}</div>
                </div>
              </div>
              <div>
                <div className="celda-principal">{u.correo}</div>
                <div className="device-type">{u.telefono || "sin teléfono"}</div>
              </div>
              <div>
                {/* El backend impide degradar al último ADMIN y auto-degradarse;
                    si se intenta, el error sube al aviso en lugar de fallar callado. */}
                <select
                  className="select-linea"
                  value={u.rol}
                  disabled={esYo}
                  title={esYo ? "No puedes cambiar tu propio rol" : "Cambiar rol"}
                  onChange={(e) => cambiarRol(u, e.target.value)}
                >
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div><Insignia activo={u.activo} /></div>
              <div className="sync-time">{fecha(u.creadoEn)}</div>
              <div className="row-actions">
                <button className="accion" onClick={() => abrirEditar(u)} title="Editar">
                  <NavIcon type="edit" size={14} />
                </button>
                <button
                  className="accion"
                  onClick={() => { setFormulario({ ...FORMULARIO_VACIO, contrasena: "" }); setModal({ tipo: "contrasena", usuario: u }); }}
                  title="Restablecer contraseña"
                >
                  <NavIcon type="key" size={14} />
                </button>
                <button
                  className="accion"
                  onClick={() => alternarEstado(u)}
                  disabled={esYo}
                  title={esYo ? "No puedes desactivarte" : (u.activo ? "Desactivar" : "Activar")}
                >
                  <NavIcon type="power" size={14} />
                </button>
                <button
                  className="accion accion-peligro"
                  onClick={() => setModal({ tipo: "eliminar", usuario: u })}
                  disabled={esYo}
                  title={esYo ? "No puedes eliminarte" : "Eliminar"}
                >
                  <NavIcon type="trash" size={14} />
                </button>
              </div>
            </div>
          );
        })}

        <Paginacion
          pagina={datos?.pagina ?? 0}
          totalPaginas={datos?.totalPaginas ?? 0}
          totalElementos={datos?.totalElementos ?? 0}
          alCambiar={setPagina}
        />
      </div>

      {(modal?.tipo === "crear" || modal?.tipo === "editar") && (
        <Modal
          titulo={modal.tipo === "crear" ? "Nuevo usuario" : `Editar ${modal.usuario.usuario}`}
          descripcion={modal.tipo === "crear"
            ? "El rol y la contraseña solo se fijan al crear."
            : "La contraseña y el rol se cambian desde sus acciones propias."}
          alCerrar={() => setModal(null)}
        >
          <form onSubmit={guardar}>
            <div className="rejilla-campos">
              <Campo etiqueta="Nombre">
                <input required maxLength={60} value={formulario.nombre}
                  onChange={(e) => setFormulario({ ...formulario, nombre: e.target.value })} />
              </Campo>
              <Campo etiqueta="Apellido">
                <input maxLength={60} value={formulario.apellido}
                  onChange={(e) => setFormulario({ ...formulario, apellido: e.target.value })} />
              </Campo>
              <Campo etiqueta="Usuario">
                <input required minLength={3} maxLength={30}
                  value={formulario.usuario}
                  onChange={(e) => setFormulario({ ...formulario, usuario: e.target.value })} />
              </Campo>
              <Campo etiqueta="Correo">
                <input required type="email" maxLength={120} value={formulario.correo}
                  onChange={(e) => setFormulario({ ...formulario, correo: e.target.value })} />
              </Campo>
              <Campo etiqueta="Teléfono">
                <input value={formulario.telefono} placeholder="Opcional"
                  onChange={(e) => setFormulario({ ...formulario, telefono: e.target.value })} />
              </Campo>
              {modal.tipo === "crear" && (
                <>
                  <Campo etiqueta="Contraseña">
                    <input required type="password" minLength={8} maxLength={72}
                      value={formulario.contrasena}
                      onChange={(e) => setFormulario({ ...formulario, contrasena: e.target.value })} />
                  </Campo>
                  <Campo etiqueta="Rol">
                    <select value={formulario.rol}
                      onChange={(e) => setFormulario({ ...formulario, rol: e.target.value })}>
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </Campo>
                </>
              )}
            </div>
            <div className="modal-pie">
              <button type="button" className="btn-plano" onClick={() => setModal(null)}>Cancelar</button>
              <button type="submit" className="export-btn" disabled={guardando}>
                {guardando ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {modal?.tipo === "contrasena" && (
        <Modal
          titulo={`Restablecer contraseña de ${modal.usuario.usuario}`}
          descripcion="Se cerrarán todas sus sesiones abiertas."
          alCerrar={() => setModal(null)}
        >
          <form onSubmit={guardarContrasena}>
            <Campo etiqueta="Nueva contraseña">
              <input required type="password" minLength={8} maxLength={72} autoFocus
                value={formulario.contrasena}
                onChange={(e) => setFormulario({ ...formulario, contrasena: e.target.value })} />
            </Campo>
            <div className="modal-pie">
              <button type="button" className="btn-plano" onClick={() => setModal(null)}>Cancelar</button>
              <button type="submit" className="export-btn" disabled={guardando}>
                {guardando ? "Guardando..." : "Restablecer"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {modal?.tipo === "eliminar" && (
        <Modal
          titulo="Eliminar usuario"
          descripcion="Esta acción no se puede deshacer."
          alCerrar={() => setModal(null)}
        >
          <p className="modal-cuerpo">
            Se eliminará <strong>{modal.usuario.usuario}</strong> ({modal.usuario.correo}).
            Sus vehículos quedarán sin propietario asignado.
          </p>
          <div className="modal-pie">
            <button type="button" className="btn-plano" onClick={() => setModal(null)}>Cancelar</button>
            <button type="button" className="btn-peligro" onClick={eliminar}>Eliminar</button>
          </div>
        </Modal>
      )}
    </>
  );
}
