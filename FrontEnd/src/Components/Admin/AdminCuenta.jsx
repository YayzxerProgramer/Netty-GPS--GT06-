import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { get, patch, put } from "../../Service/api";
import { cerrarSesion, obtenerUsuario } from "../../Service/sesion";
import { Campo } from "./AdminUI";
import { useAvisar } from "./avisos";
import { ROLES, errorDeFormulario, fecha, iniciales, nombreCompleto } from "./adminUtils";

export default function AdminCuenta() {
  const navigate = useNavigate();
  const avisar = useAvisar();
  const [perfil, setPerfil] = useState(null);
  const [datos, setDatos] = useState(null);
  const [errores, setErrores] = useState({ general: null, campos: {} });
  const [guardando, setGuardando] = useState(false);

  const [clave, setClave] = useState({ actual: "", nueva: "", repetir: "" });
  const [errorClave, setErrorClave] = useState(null);
  const [cambiandoClave, setCambiandoClave] = useState(false);

  useEffect(() => {
    get(`/usuario/usuario/${encodeURIComponent(obtenerUsuario())}`)
      .then((u) => {
        setPerfil(u);
        setDatos({ nombre: u.nombre || "", apellido: u.apellido || "", usuario: u.usuario, correo: u.correo || "", telefono: u.telefono || "" });
      })
      .catch((e) => setErrores({ general: e.message, campos: {} }));
  }, []);

  const cambiar = (campo) => (e) => setDatos((d) => ({ ...d, [campo]: e.target.value }));

  // El token va ligado al nombre de usuario: si cambia, hay que volver a entrar.
  const salirYEntrar = () => {
    cerrarSesion();
    navigate("/login", { replace: true });
  };

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setErrores({ general: null, campos: {} });
    try {
      const actualizado = await put(`/usuario/${perfil.id}`, datos);
      setPerfil(actualizado);
      if (actualizado.usuario !== perfil.usuario) {
        salirYEntrar();
        return;
      }
      avisar("Perfil actualizado");
    } catch (err) {
      setErrores(errorDeFormulario(err));
    } finally {
      setGuardando(false);
    }
  };

  const cambiarClave = async (e) => {
    e.preventDefault();
    if (clave.nueva.length < 8) return setErrorClave("La contraseña debe tener al menos 8 caracteres");
    if (clave.nueva !== clave.repetir) return setErrorClave("Las contraseñas no coinciden");
    setCambiandoClave(true);
    setErrorClave(null);
    try {
      await patch(`/usuario/contrasena/${perfil.id}`, { contrasenaActual: clave.actual, nuevaContrasena: clave.nueva });
      // El backend revoca todas las sesiones al cambiar la contraseña.
      salirYEntrar();
    } catch (err) {
      setErrorClave(err.campos?.nuevaContrasena || err.message);
      setCambiandoClave(false);
    }
  };

  const c = errores.campos;

  return (
    <div className="adm-seccion">
      <div className="adm-encabezado">
        <div>
          <div className="adm-encabezado-meta">
            <span className="adm-en-vivo"><span className="material-symbols-outlined">person</span>MI CUENTA</span>
          </div>
          <h1 className="adm-titulo">Tu <em>perfil</em></h1>
          <p className="adm-subtitulo">Datos de acceso y contacto de tu cuenta de administrador.</p>
        </div>
      </div>

      {errores.general && <div className="adm-error"><span className="material-symbols-outlined">error</span>{errores.general}</div>}

      <div className="adm-cuenta">
        <div className="adm-tarjeta adm-identidad">
          <div className="adm-identidad-avatar">{perfil ? iniciales(nombreCompleto(perfil)) : "…"}</div>
          <div className="adm-identidad-nombre">{perfil ? nombreCompleto(perfil) : "Cargando…"}</div>
          <div className="adm-identidad-usuario">@{perfil?.usuario}</div>
          <span className="adm-rol adm-rol--ADMIN">{ROLES[perfil?.rol] || perfil?.rol || "—"}</span>
          <div className="adm-identidad-datos">
            <div><span>Estado</span><b>{perfil?.activo ? "Activa" : "—"}</b></div>
            <div><span>Miembro desde</span><b>{fecha(perfil?.creadoEn)}</b></div>
            <div><span>Última edición</span><b>{fecha(perfil?.actualizadoEn)}</b></div>
          </div>
        </div>

        <div className="adm-cuenta-formularios">
          <form className="adm-tarjeta" onSubmit={guardar} noValidate>
            <div className="adm-tarjeta-cab">
              <div>
                <div className="adm-tarjeta-titulo">Datos personales</div>
                <div className="adm-tarjeta-sub">Cambiar el nombre de usuario cierra la sesión.</div>
              </div>
              <span className="material-symbols-outlined adm-tarjeta-icono">badge</span>
            </div>
            {datos && (
              <div className="adm-form">
                <Campo etiqueta="Nombre" error={c.nombre}>
                  <input className="adm-entrada" value={datos.nombre} onChange={cambiar("nombre")} maxLength={60} />
                </Campo>
                <Campo etiqueta="Apellido" error={c.apellido}>
                  <input className="adm-entrada" value={datos.apellido} onChange={cambiar("apellido")} maxLength={60} />
                </Campo>
                <Campo etiqueta="Nombre de usuario" error={c.usuario}>
                  <input className="adm-entrada" value={datos.usuario} onChange={cambiar("usuario")} maxLength={30} autoComplete="username" />
                </Campo>
                <Campo etiqueta="Teléfono" error={c.telefono}>
                  <input className="adm-entrada" value={datos.telefono} onChange={cambiar("telefono")} inputMode="tel" />
                </Campo>
                <Campo etiqueta="Correo electrónico" error={c.correo} ancho>
                  <input className="adm-entrada" type="email" value={datos.correo} onChange={cambiar("correo")} maxLength={120} />
                </Campo>
              </div>
            )}
            <div className="adm-tarjeta-pie">
              <button type="submit" className="adm-btn-primario" disabled={!datos || guardando}>
                <span className="material-symbols-outlined">save</span>{guardando ? "Guardando…" : "Guardar cambios"}
              </button>
            </div>
          </form>

          <form className="adm-tarjeta" onSubmit={cambiarClave} noValidate>
            <div className="adm-tarjeta-cab">
              <div>
                <div className="adm-tarjeta-titulo">Seguridad</div>
                <div className="adm-tarjeta-sub">Al cambiarla se cierran todas tus sesiones abiertas.</div>
              </div>
              <span className="material-symbols-outlined adm-tarjeta-icono">lock_reset</span>
            </div>
            {errorClave && <div className="adm-error adm-error--sm"><span className="material-symbols-outlined">error</span>{errorClave}</div>}
            <div className="adm-form">
              <Campo etiqueta="Contraseña actual" ancho>
                <input className="adm-entrada" type="password" value={clave.actual} onChange={(e) => setClave((k) => ({ ...k, actual: e.target.value }))} autoComplete="current-password" />
              </Campo>
              <Campo etiqueta="Nueva contraseña">
                <input className="adm-entrada" type="password" value={clave.nueva} onChange={(e) => setClave((k) => ({ ...k, nueva: e.target.value }))} autoComplete="new-password" />
              </Campo>
              <Campo etiqueta="Repite la nueva">
                <input className="adm-entrada" type="password" value={clave.repetir} onChange={(e) => setClave((k) => ({ ...k, repetir: e.target.value }))} autoComplete="new-password" />
              </Campo>
            </div>
            <div className="adm-tarjeta-pie">
              <button type="submit" className="adm-btn-secundario" disabled={!perfil || cambiandoClave || !clave.nueva}>
                <span className="material-symbols-outlined">key</span>{cambiandoClave ? "Actualizando…" : "Cambiar contraseña"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
