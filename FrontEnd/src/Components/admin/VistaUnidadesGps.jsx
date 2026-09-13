/**
 * GPS Units — inventario de vehículos y sus equipos GT06.
 *
 * Cubre el alta de dispositivos (el botón "Register New Device" de la barra
 * lateral no hacía nada), la asignación a propietario y la baja.
 */
import { useState, useEffect, useCallback } from "react";
import { get, post, put, patch, del } from "../../Service/api";
import NavIcon from "./Iconos";
import { Aviso, Cargando, Vacio, Paginacion, Modal, Campo, Insignia } from "./Comunes";
import { fecha } from "./formato";

const TIPOS = ["CARRO", "MOTO"];

const FORMULARIO_VACIO = { placa: "", imei: "", modelo: "", tipo: "CARRO", id_usuario: "" };

export default function VistaUnidadesGps({ busqueda, abrirAltaAlEntrar }) {
  const [pagina, setPagina] = useState(0);
  const [datos, setDatos] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);

  const [filtroActivo, setFiltroActivo] = useState("");
  const [soloSinGps, setSoloSinGps] = useState(false);

  // Sin efecto: Dashboard remonta esta vista con otra key al pulsar
  // "Register New Device", así que basta con el estado inicial.
  const [modal, setModal] = useState(abrirAltaAlEntrar ? { tipo: "crear" } : null);
  const [formulario, setFormulario] = useState(FORMULARIO_VACIO);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const parametros = new URLSearchParams({ pagina: String(pagina), tamano: "12" });
      if (busqueda) parametros.set("busqueda", busqueda);
      if (filtroActivo) parametros.set("activo", filtroActivo);
      setDatos(await get(`/admin/vehiculos?${parametros}`));
    } catch (e) {
      setError(e.message || "No se pudieron cargar los vehículos");
    } finally {
      setCargando(false);
    }
  }, [pagina, busqueda, filtroActivo]);

  // La espera de 300 ms evita una petición por cada tecla del buscador, y
  // mantiene el setState fuera del cuerpo síncrono del efecto, que dispara
  // renders en cascada.
  useEffect(() => {
    const id = setTimeout(cargar, 300);
    return () => clearTimeout(id);
  }, [cargar]);

  // Al cambiar la búsqueda o un filtro hay que volver a la primera página:
  // si estabas en la 3 y el filtro nuevo devuelve una sola, quedaba vacía.
  // Se compara con el valor anterior durante el render —el patrón que React
  // recomienda para derivar estado— en lugar de un efecto.
  const criterios = `${busqueda}|${filtroActivo}`;
  const [criteriosPrevios, setCriteriosPrevios] = useState(criterios);
  if (criterios !== criteriosPrevios) {
    setCriteriosPrevios(criterios);
    setPagina(0);
  }

  // Los propietarios se piden una sola vez: alimentan el desplegable de
  // asignación y la columna "propietario", que solo trae el UUID.
  useEffect(() => {
    get("/admin/usuarios?tamano=200")
      .then((p) => setUsuarios(p.contenido))
      .catch(() => setUsuarios([]));
  }, []);

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

  const nombreDe = (idUsuario) => {
    if (!idUsuario) return "Sin asignar";
    const duenno = usuarios.find((u) => u.id === idUsuario);
    return duenno ? `${duenno.nombre} ${duenno.apellido || ""}`.trim() : "Propietario desconocido";
  };

  const abrirEditar = (v) => {
    setFormulario({
      placa: v.placa || "", imei: v.imei || "", modelo: v.modelo || "",
      tipo: v.tipo || "CARRO", id_usuario: v.id_usuario || "",
    });
    setModal({ tipo: "editar", vehiculo: v });
  };

  const guardar = async (evento) => {
    evento.preventDefault();
    setGuardando(true);
    const esCrear = modal.tipo === "crear";
    const ok = await conAviso(async () => {
      if (esCrear) {
        await post("/vehiculo", {
          placa: formulario.placa,
          imei: formulario.imei || null,
          modelo: formulario.modelo,
          tipo: formulario.tipo,
          id_usuario: formulario.id_usuario || null,
        });
      } else {
        // El propietario no viaja en este PUT: tiene su propio endpoint.
        await put(`/vehiculo/${modal.vehiculo.id}`, {
          placa: formulario.placa,
          imei: formulario.imei || "",
          modelo: formulario.modelo,
          tipo: formulario.tipo,
        });
        if ((formulario.id_usuario || null) !== (modal.vehiculo.id_usuario || null)) {
          await put(`/admin/vehiculos/${modal.vehiculo.id}/usuario`, {
            id_usuario: formulario.id_usuario || null,
          });
        }
      }
    }, esCrear ? "Dispositivo registrado" : "Dispositivo actualizado");
    setGuardando(false);
    if (ok) setModal(null);
  };

  const asignar = async (evento) => {
    evento.preventDefault();
    setGuardando(true);
    const ok = await conAviso(
      () => put(`/admin/vehiculos/${modal.vehiculo.id}/usuario`, { id_usuario: formulario.id_usuario || null }),
      "Propietario actualizado",
    );
    setGuardando(false);
    if (ok) setModal(null);
  };

  const alternarEstado = (v) =>
    conAviso(() => patch(`/admin/vehiculos/${v.id}/estado`), `${v.placa} ${v.activo ? "desactivado" : "activado"}`);

  const eliminar = async () => {
    const ok = await conAviso(() => del(`/admin/vehiculos/${modal.vehiculo.id}`), "Dispositivo eliminado");
    if (ok) setModal(null);
  };

  const exportarCsv = () => {
    const cabecera = "placa,imei,modelo,tipo,activo,propietario,creadoEn";
    const filas = vehiculos.map((v) =>
      [v.placa, v.imei || "", v.modelo, v.tipo, v.activo, nombreDe(v.id_usuario), v.creadoEn].join(","));
    const enlace = document.createElement("a");
    enlace.href = URL.createObjectURL(new Blob([[cabecera, ...filas].join("\n")], { type: "text/csv" }));
    enlace.download = `unidades-gps-${new Date().toISOString().slice(0, 10)}.csv`;
    enlace.click();
    URL.revokeObjectURL(enlace.href);
  };

  const todos = datos?.contenido || [];
  const vehiculos = soloSinGps ? todos.filter((v) => !v.imei) : todos;
  const columnas = "170px 190px 170px 110px 120px 1fr";

  return (
    <>
      <div className="page-header">
        <div className="header-row">
          <div>
            <h1 className="page-title">GPS Units</h1>
            <p className="page-desc">Inventario de equipos GT06 y los vehículos que los llevan.</p>
          </div>
          <div className="header-meta">
            <div className="meta-item">
              <label>EN INVENTARIO</label>
              <span>{datos?.totalElementos ?? 0}</span>
            </div>
            <div className="meta-item">
              <label>SIN EQUIPO</label>
              <span>{todos.filter((v) => !v.imei).length}</span>
            </div>
          </div>
        </div>
      </div>

      <Aviso texto={error} alCerrar={() => setError(null)} />
      <Aviso texto={exito} tipo="exito" alCerrar={() => setExito(null)} />

      <div className="barra-acciones">
        <div className="filtros">
          <select value={filtroActivo} onChange={(e) => setFiltroActivo(e.target.value)}>
            <option value="">Cualquier estado</option>
            <option value="true">Solo activos</option>
            <option value="false">Solo inactivos</option>
          </select>
          <label className="casilla">
            <input type="checkbox" checked={soloSinGps} onChange={(e) => setSoloSinGps(e.target.checked)} />
            Solo sin equipo GPS
          </label>
          <button className="btn-plano" onClick={cargar}><NavIcon type="refresh" size={14} /> Recargar</button>
        </div>
        <div className="filtros">
          <button className="btn-plano" onClick={exportarCsv}><NavIcon type="upload" /> Exportar CSV</button>
          <button className="export-btn" onClick={() => { setFormulario(FORMULARIO_VACIO); setModal({ tipo: "crear" }); }}>
            <NavIcon type="plus" /> Registrar dispositivo
          </button>
        </div>
      </div>

      <div className="deployments">
        <div className="table-header" style={{ gridTemplateColumns: columnas }}>
          <span>PLACA / IMEI</span>
          <span>PROPIETARIO</span>
          <span>MODELO</span>
          <span>ESTADO</span>
          <span>ALTA</span>
          <span>ACCIONES</span>
        </div>

        {cargando && <Cargando />}
        {!cargando && vehiculos.length === 0 && (
          <Vacio texto={busqueda || soloSinGps ? "Sin resultados para el filtro" : "No hay dispositivos registrados"} />
        )}

        {!cargando && vehiculos.map((v) => (
          <div key={v.id} className="table-row" style={{ gridTemplateColumns: columnas }}>
            <div>
              <div className="device-id">{v.placa}</div>
              <div className={`device-type ${v.imei ? "" : "sin-equipo"}`}>{v.imei || "SIN EQUIPO GPS"}</div>
            </div>
            <div className="client-cell">
              <div className="client-avatar">{nombreDe(v.id_usuario).slice(0, 2).toUpperCase()}</div>
              <span className="client-name">{nombreDe(v.id_usuario)}</span>
            </div>
            <div className="region">{v.modelo} · {v.tipo}</div>
            <div><Insignia activo={v.activo} /></div>
            <div className="sync-time">{fecha(v.creadoEn)}</div>
            <div className="row-actions">
              <button className="accion" onClick={() => abrirEditar(v)} title="Editar">
                <NavIcon type="edit" size={14} />
              </button>
              <button
                className="accion"
                onClick={() => { setFormulario({ ...FORMULARIO_VACIO, id_usuario: v.id_usuario || "" }); setModal({ tipo: "asignar", vehiculo: v }); }}
                title="Asignar propietario"
              >
                <NavIcon type="link" size={14} />
              </button>
              <button className="accion" onClick={() => alternarEstado(v)} title={v.activo ? "Desactivar" : "Activar"}>
                <NavIcon type="power" size={14} />
              </button>
              <button
                className="accion accion-peligro"
                onClick={() => setModal({ tipo: "eliminar", vehiculo: v })}
                title="Eliminar"
              >
                <NavIcon type="trash" size={14} />
              </button>
            </div>
          </div>
        ))}

        <Paginacion
          pagina={datos?.pagina ?? 0}
          totalPaginas={datos?.totalPaginas ?? 0}
          totalElementos={datos?.totalElementos ?? 0}
          alCambiar={setPagina}
        />
      </div>

      {(modal?.tipo === "crear" || modal?.tipo === "editar") && (
        <Modal
          titulo={modal.tipo === "crear" ? "Registrar dispositivo" : `Editar ${modal.vehiculo.placa}`}
          descripcion="El IMEI es opcional: un vehículo puede existir antes de que le instalen el equipo."
          alCerrar={() => setModal(null)}
        >
          <form onSubmit={guardar}>
            <div className="rejilla-campos">
              <Campo etiqueta="Placa">
                <input required minLength={5} maxLength={6} value={formulario.placa}
                  onChange={(e) => setFormulario({ ...formulario, placa: e.target.value.toUpperCase() })} />
              </Campo>
              <Campo etiqueta="IMEI del equipo">
                <input value={formulario.imei} placeholder="15 o 16 dígitos"
                  onChange={(e) => setFormulario({ ...formulario, imei: e.target.value })} />
              </Campo>
              <Campo etiqueta="Modelo">
                <input required maxLength={60} value={formulario.modelo}
                  onChange={(e) => setFormulario({ ...formulario, modelo: e.target.value })} />
              </Campo>
              <Campo etiqueta="Tipo">
                <select value={formulario.tipo}
                  onChange={(e) => setFormulario({ ...formulario, tipo: e.target.value })}>
                  {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Campo>
              <Campo etiqueta="Propietario">
                <select value={formulario.id_usuario}
                  onChange={(e) => setFormulario({ ...formulario, id_usuario: e.target.value })}>
                  <option value="">Sin asignar</option>
                  {usuarios.map((u) => (
                    <option key={u.id} value={u.id}>{u.usuario} — {u.nombre} {u.apellido || ""}</option>
                  ))}
                </select>
              </Campo>
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

      {modal?.tipo === "asignar" && (
        <Modal
          titulo={`Asignar ${modal.vehiculo.placa}`}
          descripcion="El propietario es quien verá el vehículo en su panel y en el mapa."
          alCerrar={() => setModal(null)}
        >
          <form onSubmit={asignar}>
            <Campo etiqueta="Propietario">
              <select value={formulario.id_usuario} autoFocus
                onChange={(e) => setFormulario({ ...formulario, id_usuario: e.target.value })}>
                <option value="">Sin asignar</option>
                {usuarios.map((u) => (
                  <option key={u.id} value={u.id}>{u.usuario} — {u.nombre} {u.apellido || ""}</option>
                ))}
              </select>
            </Campo>
            <div className="modal-pie">
              <button type="button" className="btn-plano" onClick={() => setModal(null)}>Cancelar</button>
              <button type="submit" className="export-btn" disabled={guardando}>
                {guardando ? "Guardando..." : "Asignar"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {modal?.tipo === "eliminar" && (
        <Modal titulo="Eliminar dispositivo" descripcion="Esta acción no se puede deshacer." alCerrar={() => setModal(null)}>
          <p className="modal-cuerpo">
            Se eliminará <strong>{modal.vehiculo.placa}</strong>
            {modal.vehiculo.imei ? ` (IMEI ${modal.vehiculo.imei})` : ""}.
            El histórico de posiciones en MongoDB no se borra.
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
