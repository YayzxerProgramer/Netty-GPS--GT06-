import { get } from "../../Service/api";

/** Una unidad con velocidad que no reporta en este tiempo deja de estar "en marcha". */
export const MS_EN_MARCHA = 5 * 60 * 1000;

export const ESTADOS = {
  marcha: "EN MARCHA",
  detenido: "DETENIDO",
  sin: "SIN DATOS",
  nogps: "SIN GPS",
  off: "INACTIVO",
};

export const ROLES = {
  ADMINISTRADOR: "Administrador",
  ADMIN: "Administrador",
  USUARIO: "Cliente",
  USER: "Cliente",
  VIEWER: "Solo lectura",
};

/** Normaliza una trama GPSData del backend. */
export function aPosicion(d) {
  if (!d || d.latitud == null || d.longitud == null) return null;
  const fecha = d.registradoEn || d.creadosEn;
  return {
    lat: Number(d.latitud),
    lng: Number(d.longitud),
    vel: Number(d.velocidad) || 0,
    fecha: fecha ? new Date(fecha).getTime() : Date.now(),
  };
}

export function estadoDe(v, pos, ahora) {
  if (!v.imei) return "nogps";
  if (!v.activo) return "off";
  if (!pos) return "sin";
  return pos.vel > 0 && ahora - pos.fecha < MS_EN_MARCHA ? "marcha" : "detenido";
}

export function haceCuanto(fecha, ahora) {
  const s = Math.max(0, Math.round((ahora - fecha) / 1000));
  if (s < 60) return `hace ${s} s`;
  if (s < 3600) return `hace ${Math.round(s / 60)} min`;
  if (s < 86400) return `hace ${Math.round(s / 3600)} h`;
  return `hace ${Math.round(s / 86400)} d`;
}

export function iniciales(nombre) {
  return (nombre || "?").split(" ").filter(Boolean).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

/** Nombre del propietario de un vehículo, distinguiendo "sin dueño" de "no se pudo cargar". */
export function nombrePropietario(idUsuario, u) {
  if (!idUsuario) return "Sin asignar";
  return u ? nombreCompleto(u) : "Propietario no disponible";
}

export function nombreCompleto(u) {
  if (!u) return "Sin asignar";
  return `${u.nombre || ""} ${u.apellido || ""}`.trim() || u.usuario;
}

export const numero = (valor) => (valor ?? 0).toLocaleString("es-CO");

/** "1 cuenta", "3 cuentas". */
export const contar = (n, singular, plural = `${singular}s`) => `${numero(n)} ${n === 1 ? singular : plural}`;

export const fecha = (valor) => (valor ? new Date(valor).toLocaleDateString("es-CO") : "—");

/**
 * Propietarios por id, con caché. Antes el panel pedía los 100 primeros
 * usuarios y buscaba ahí al dueño de cada vehículo: con más de 100 usuarios
 * casi todos los vehículos salían "Sin asignar" aunque tuvieran dueño.
 */
const cacheUsuarios = new Map();

export async function cargarPropietarios(ids) {
  const pendientes = [...new Set(ids.filter(Boolean))].filter((id) => !cacheUsuarios.has(id));
  await Promise.allSettled(pendientes.map(async (id) => {
    cacheUsuarios.set(id, await get(`/admin/usuarios/${id}`));
  }));
  const mapa = {};
  ids.filter(Boolean).forEach((id) => {
    if (cacheUsuarios.has(id)) mapa[id] = cacheUsuarios.get(id);
  });
  return mapa;
}

export function olvidarPropietario(id) {
  cacheUsuarios.delete(id);
}

/** Última posición de cada IMEI. Un 404 = el equipo aún no ha reportado. */
export async function cargarPosiciones(vehiculos) {
  const conImei = vehiculos.filter((v) => v.imei);
  const resultados = await Promise.allSettled(
    conImei.map((v) => get(`/gps/ultima-posicion/${v.imei}`)));
  const posiciones = {};
  resultados.forEach((r, i) => {
    const pos = r.status === "fulfilled" ? aPosicion(r.value) : null;
    if (pos) posiciones[conImei[i].imei] = pos;
  });
  return posiciones;
}

/** Mensaje de error del backend, con los errores de validación campo a campo. */
export function errorDeFormulario(e) {
  return { general: e.campos ? null : e.message || "No se pudo guardar", campos: e.campos || {} };
}

/** Construye la query string ignorando los valores vacíos. */
export function query(params) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") q.set(k, v);
  });
  const s = q.toString();
  return s ? `?${s}` : "";
}
