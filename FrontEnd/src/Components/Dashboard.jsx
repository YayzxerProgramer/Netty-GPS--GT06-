import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleMap, useJsApiLoader } from "@react-google-maps/api";
import { Client } from "@stomp/stompjs";
import { obtenerUsuario, obtenerToken, cerrarSesion } from "../Service/sesion";
import { get, patch, urlWebSocket } from "../Service/api";
import { ESTILO_MAPA } from "./mapaUtils";

import "../Styles/DashBoard.css";

// Mismas opciones de carga que Mapa.jsx: el cargador de Google Maps falla si se
// invoca dos veces con opciones distintas.
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const GOOGLE_MAP_LIBRARIES = ["places"];

const CENTRO_DEFAULT = { lat: 10.419, lng: -75.538 };

const OPCIONES_MAPA = {
  styles: ESTILO_MAPA,
  disableDefaultUI: true,
  gestureHandling: "cooperative",
  clickableIcons: false,
  backgroundColor: "#0f120e",
};

/** Una unidad con velocidad que no reporta en este tiempo deja de estar "en marcha". */
const MS_EN_MARCHA = 5 * 60 * 1000;

const NAV = [
  { id: "dashboard", label: "Resumen", icon: "dashboard" },
  { id: "fleet", label: "Monitor de flota", icon: "radar" },
  { id: "clients", label: "Clientes", icon: "group" },
  { id: "gps", label: "Unidades GPS", icon: "satellite_alt" },
  { id: "analytics", label: "Analítica", icon: "monitoring" },
];

const GESTION = [
  { icon: "group", titulo: "Registro de clientes", desc: "Altas, roles y acceso de usuarios" },
  { icon: "inventory_2", titulo: "Inventario de equipos", desc: "Equipos GT06 y vehículos" },
  { icon: "link", titulo: "Vincular vehículo y usuario", desc: "Asignar equipos a propietarios" },
];

const ESTADOS = {
  marcha: "EN MARCHA",
  detenido: "DETENIDO",
  sin: "SIN DATOS",
  nogps: "SIN GPS",
  off: "INACTIVO",
};

/** Normaliza una trama GPSData del backend. */
function aPosicion(d) {
  if (!d || d.latitud == null || d.longitud == null) return null;
  const fecha = d.registradoEn || d.creadosEn;
  return {
    lat: Number(d.latitud),
    lng: Number(d.longitud),
    vel: Number(d.velocidad) || 0,
    fecha: fecha ? new Date(fecha).getTime() : Date.now(),
  };
}

function estadoDe(v, pos, ahora) {
  if (!v.imei) return "nogps";
  if (!v.activo) return "off";
  if (!pos) return "sin";
  return pos.vel > 0 && ahora - pos.fecha < MS_EN_MARCHA ? "marcha" : "detenido";
}

function haceCuanto(fecha, ahora) {
  const s = Math.max(0, Math.round((ahora - fecha) / 1000));
  if (s < 60) return `hace ${s} s`;
  if (s < 3600) return `hace ${Math.round(s / 60)} min`;
  if (s < 86400) return `hace ${Math.round(s / 3600)} h`;
  return `hace ${Math.round(s / 86400)} d`;
}

function iniciales(nombre) {
  return nombre.split(" ").filter(Boolean).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

function htmlMarcador(estado, placa, activo) {
  let punto;
  if (estado === "marcha") {
    punto = `<span class="adm-mk-ping"></span><span class="adm-mk-dot adm-mk-dot--marcha"></span>`;
  } else if (estado === "detenido") {
    punto = `<span class="adm-mk-dot adm-mk-dot--detenido"></span>`;
  } else {
    punto = `<span class="adm-mk-dot adm-mk-dot--sin"></span>`;
  }
  const anillo = activo ? `<span class="adm-mk-anillo"></span>` : "";
  const etiqueta = activo ? `<span class="adm-mk-etiqueta">${placa}</span>` : "";
  return `${anillo}${punto}${etiqueta}`;
}

/**
 * Marcador HTML que recibe clics. El de mapaUtils se dibuja en la capa sin
 * eventos (para no bloquear el arrastre del panel de control); aquí cada
 * unidad es seleccionable, así que va en overlayMouseTarget.
 */
function crearMarcadorFlota(google, mapa, posicion, onClick) {
  class MarcadorFlota extends google.maps.OverlayView {
    constructor() {
      super();
      this.pos = posicion;
      this.tamano = 16;
      this.div = document.createElement("div");
      this.div.className = "adm-mk";
      this.div.addEventListener("click", (e) => {
        e.stopPropagation();
        onClick();
      });
    }

    onAdd() {
      this.getPanes().overlayMouseTarget.appendChild(this.div);
    }

    draw() {
      const proyeccion = this.getProjection();
      if (!proyeccion) return;
      const p = proyeccion.fromLatLngToDivPixel(new google.maps.LatLng(this.pos));
      const s = this.tamano;
      Object.assign(this.div.style, {
        left: `${p.x - s / 2}px`,
        top: `${p.y - s / 2}px`,
        width: `${s}px`,
        height: `${s}px`,
        zIndex: s > 16 ? "10" : "1",
      });
    }

    onRemove() {
      this.div.remove();
    }

    actualizar(pos, html, tamano) {
      this.pos = pos;
      this.tamano = tamano;
      if (this.html !== html) {
        this.div.innerHTML = html;
        this.html = html;
      }
      this.draw();
    }
  }

  const marcador = new MarcadorFlota();
  marcador.setMap(mapa);
  return marcador;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const usuario = obtenerUsuario() || "ADMIN";

  const [activeNav, setActiveNav] = useState("dashboard");
  const [menuAbierto, setMenuAbierto] = useState(false);

  const [resumen, setResumen] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [vehiculos, setVehiculos] = useState([]);
  const [posiciones, setPosiciones] = useState({});
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [actualizado, setActualizado] = useState("ahora");
  const [seleccion, setSeleccion] = useState(null);
  const [ahora, setAhora] = useState(() => Date.now());

  const esClaveValida = GOOGLE_MAPS_API_KEY && GOOGLE_MAPS_API_KEY.startsWith("AIzaSy");
  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: esClaveValida ? GOOGLE_MAPS_API_KEY : "",
    libraries: GOOGLE_MAP_LIBRARIES,
  });

  const [mapa, setMapa] = useState(null);
  const marcadoresRef = useRef({});
  const encuadradoRef = useRef(false);
  const tablaRef = useRef(null);

  const cargar = useCallback(async (texto = "") => {
    setCargando(true);
    setError(null);
    try {
      const filtro = texto ? `&busqueda=${encodeURIComponent(texto)}` : "";
      const [datosResumen, pagUsuarios, pagVehiculos] = await Promise.all([
        get("/admin/resumen"),
        // Sin filtro: se usa solo para poner nombre al propietario de cada vehículo.
        get("/admin/usuarios?tamano=100"),
        get(`/admin/vehiculos?tamano=25${filtro}`),
      ]);
      setResumen(datosResumen);
      setUsuarios(pagUsuarios.contenido);
      setVehiculos(pagVehiculos.contenido);

      // Última posición conocida de cada equipo. Un 404 significa que el
      // equipo todavía no ha reportado; no es un error del panel.
      const conImei = pagVehiculos.contenido.filter((v) => v.imei);
      const resultados = await Promise.allSettled(
        conImei.map((v) => get(`/gps/ultima-posicion/${v.imei}`)));
      const nuevas = {};
      resultados.forEach((r, i) => {
        const pos = r.status === "fulfilled" ? aPosicion(r.value) : null;
        if (pos) nuevas[conImei[i].imei] = pos;
      });
      setPosiciones(nuevas);

      setActualizado(new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: false }));
    } catch (e) {
      setError(e.message || "No se pudieron cargar los datos");
    } finally {
      setCargando(false);
    }
  }, []);

  // Carga inicial y buscador en un solo efecto: la espera de 400 ms evita una
  // petición por tecla y al montar dispara igualmente la primera carga.
  useEffect(() => {
    const id = setTimeout(() => cargar(busqueda), 400);
    return () => clearTimeout(id);
  }, [busqueda, cargar]);

  // Reloj para los "hace X s" y para que una unidad deje de figurar en marcha
  // cuando deja de reportar.
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 5000);
    return () => clearInterval(id);
  }, []);

  // Posiciones en vivo. Un solo cliente STOMP para toda la flota visible; el
  // backend deja a un ADMIN suscribirse a cualquier IMEI.
  const imeis = useMemo(
    () => vehiculos.filter((v) => v.imei).map((v) => v.imei).sort().join(","),
    [vehiculos]);

  useEffect(() => {
    const token = obtenerToken();
    if (!imeis || !token) return;

    const client = new Client({
      brokerURL: urlWebSocket(),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      onConnect: () => {
        imeis.split(",").forEach((imei) => {
          client.subscribe(`/socket/gps/${imei}`, (mensaje) => {
            try {
              const pos = aPosicion(JSON.parse(mensaje.body));
              if (pos) setPosiciones((prev) => ({ ...prev, [imei]: pos }));
            } catch {
              // Trama ilegible: se ignora y se espera la siguiente.
            }
          });
        });
      },
    });
    client.activate();
    return () => {
      client.deactivate();
    };
  }, [imeis]);

  const flota = useMemo(() => vehiculos.map((v) => {
    const duenno = usuarios.find((u) => u.id === v.id_usuario);
    const pos = v.imei ? posiciones[v.imei] || null : null;
    return {
      ...v,
      pos,
      propietario: duenno ? `${duenno.nombre} ${duenno.apellido || ""}`.trim() : "Sin asignar",
      estado: estadoDe(v, pos, ahora),
    };
  }), [vehiculos, usuarios, posiciones, ahora]);

  const conteo = useMemo(() => ({
    marcha: flota.filter((v) => v.estado === "marcha").length,
    detenido: flota.filter((v) => v.estado === "detenido").length,
    sin: flota.filter((v) => v.estado === "sin").length,
  }), [flota]);

  const seleccionado = flota.find((v) => v.id === seleccion) || null;

  const encuadrarFlota = useCallback(() => {
    if (!mapa || !window.google) return;
    const puntos = flota.filter((v) => v.pos).map((v) => v.pos);
    if (puntos.length === 0) {
      mapa.setCenter(CENTRO_DEFAULT);
      mapa.setZoom(13);
    } else if (puntos.length === 1) {
      mapa.setCenter(puntos[0]);
      mapa.setZoom(15);
    } else {
      const limites = new window.google.maps.LatLngBounds();
      puntos.forEach((p) => limites.extend(p));
      mapa.fitBounds(limites, 70);
    }
  }, [mapa, flota]);

  const elegir = useCallback((id) => {
    const nueva = seleccion === id ? null : id;
    setSeleccion(nueva);
    const v = flota.find((x) => x.id === id);
    if (nueva && v?.pos && mapa) {
      mapa.panTo(v.pos);
      mapa.setZoom(16);
    }
  }, [seleccion, flota, mapa]);

  // Sincroniza los marcadores con la flota.
  const elegirRef = useRef(elegir);
  useEffect(() => {
    elegirRef.current = elegir;
  });

  useEffect(() => {
    if (!mapa || !window.google) return;
    const marcadores = marcadoresRef.current;
    const vigentes = new Set();

    flota.forEach((v) => {
      if (!v.pos) return;
      vigentes.add(v.id);
      const activo = v.id === seleccion;
      if (!marcadores[v.id]) {
        marcadores[v.id] = crearMarcadorFlota(window.google, mapa, v.pos, () => elegirRef.current(v.id));
      }
      marcadores[v.id].actualizar(v.pos, htmlMarcador(v.estado, v.placa, activo), activo ? 22 : 16);
    });

    Object.keys(marcadores).forEach((id) => {
      if (!vigentes.has(id)) {
        marcadores[id].setMap(null);
        delete marcadores[id];
      }
    });

    // Encuadre automático solo la primera vez que hay posiciones.
    if (!encuadradoRef.current && vigentes.size > 0) {
      encuadradoRef.current = true;
      encuadrarFlota();
    }
  }, [mapa, flota, seleccion, encuadrarFlota]);

  useEffect(() => () => {
    Object.values(marcadoresRef.current).forEach((m) => m.setMap(null));
    marcadoresRef.current = {};
  }, []);

  const manejarCerrarSesion = () => {
    cerrarSesion();
    navigate("/login", { replace: true });
  };

  const alternarEstadoVehiculo = async (id) => {
    try {
      await patch(`/admin/vehiculos/${id}/estado`);
      cargar(busqueda);
    } catch (e) {
      setError(e.message);
    }
  };

  const exportarCsv = () => {
    const cabecera = "imei,placa,modelo,tipo,activo,creadoEn";
    const filas = vehiculos.map((v) =>
      [v.imei || "", v.placa, v.modelo, v.tipo, v.activo, v.creadoEn].join(","));
    const csv = [cabecera, ...filas].join("\n");

    const enlace = document.createElement("a");
    enlace.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    enlace.download = `vehiculos-${new Date().toISOString().slice(0, 10)}.csv`;
    enlace.click();
    URL.revokeObjectURL(enlace.href);
  };

  const numero = (valor) => (valor ?? 0).toLocaleString("es-CO");

  const total = resumen?.totalVehiculos ?? 0;
  const conImei = resumen?.vehiculosConImei ?? 0;
  const cobertura = total ? Math.round((conImei / total) * 100) : 0;
  const pctActivos = resumen?.totalUsuarios
    ? Math.round((resumen.usuariosActivos / resumen.totalUsuarios) * 100)
    : 0;
  const sinDuenno = resumen?.vehiculosSinDuenno ?? 0;
  const sinGps = Math.max(0, total - conImei);

  return (
    <div className="adm">
      {menuAbierto && <div className="adm-velo" onClick={() => setMenuAbierto(false)} />}

      <aside className={`adm-lateral ${menuAbierto ? "abierto" : ""}`}>
        <div className="adm-marca">
          <span className="material-symbols-outlined adm-marca-icono">explore</span>ROMP GPS
        </div>
        <div className="adm-lateral-titulo">Administración</div>
        <nav className="adm-nav">
          {NAV.map((n) => (
            <button
              key={n.id}
              className={`adm-nav-item ${activeNav === n.id ? "activo" : ""}`}
              onClick={() => { setActiveNav(n.id); setMenuAbierto(false); }}
            >
              <span className="material-symbols-outlined">{n.icon}</span>{n.label}
            </button>
          ))}
        </nav>
        <div className="adm-lateral-pie">
          <button className="adm-btn-registrar">
            <span className="material-symbols-outlined">add</span>Registrar equipo
          </button>
          <button className="adm-lateral-link" onClick={() => navigate("/configuracion")}>
            <span className="material-symbols-outlined">person</span>Mi perfil
          </button>
          <button className="adm-lateral-link adm-lateral-link--salir" onClick={manejarCerrarSesion}>
            <span className="material-symbols-outlined">logout</span>Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="adm-cuerpo">
        <header className="adm-cabecera">
          <button className="adm-icono-btn adm-menu-btn" aria-label="Abrir menú" onClick={() => setMenuAbierto(true)}>
            <span className="material-symbols-outlined">menu</span>
          </button>
          <label className="adm-buscador">
            <span className="material-symbols-outlined">search</span>
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar placa, modelo o IMEI..."
            />
          </label>
          <div className="adm-cabecera-der">
            <button className="adm-icono-btn" title="Notificaciones">
              <span className="material-symbols-outlined">notifications</span>
              <span className="adm-icono-punto" />
            </button>
            <button className="adm-icono-btn adm-ocultar-movil" title="Configuración">
              <span className="material-symbols-outlined">settings</span>
            </button>
            <button className="adm-icono-btn adm-ocultar-movil" title="Ayuda">
              <span className="material-symbols-outlined">help</span>
            </button>
            <div className="adm-separador" />
            <div className="adm-sesion">
              <div className="adm-sesion-nombre">{usuario.toUpperCase()}</div>
              <div className="adm-sesion-estado">SESIÓN ACTIVA</div>
            </div>
            <div className="adm-avatar">{usuario.charAt(0).toUpperCase()}</div>
          </div>
        </header>

        <main className="adm-principal">
          <div className="adm-contenido">
            <div className="adm-encabezado">
              <div>
                <div className="adm-encabezado-meta">
                  <span className="adm-en-vivo"><span className="adm-en-vivo-punto" />SISTEMA EN VIVO</span>
                  <span className="adm-encabezado-nota">{numero(total)} vehículos bajo gestión</span>
                </div>
                <h1 className="adm-titulo">Centro de <em>mando</em></h1>
                <p className="adm-subtitulo">Administración de usuarios, vehículos y dispositivos GPS.</p>
              </div>
              <button className="adm-btn-secundario" onClick={() => cargar(busqueda)} disabled={cargando}>
                <span className="material-symbols-outlined">refresh</span>
                {cargando ? "Cargando…" : `Recargar · ${actualizado}`}
              </button>
            </div>

            {error && (
              <div className="adm-error" role="alert">
                <span className="material-symbols-outlined">error</span>{error}
              </div>
            )}

            <div className="adm-stats">
              <div className="adm-stat">
                <div className="adm-stat-cab"><span>USUARIOS</span><span className="material-symbols-outlined">group</span></div>
                <div className="adm-stat-valor">{numero(resumen?.totalUsuarios)}</div>
                <div className="adm-stat-sub"><b>{numero(resumen?.usuariosActivos)} activos</b> · {pctActivos}%</div>
                <div className="adm-progreso"><div style={{ width: `${pctActivos}%` }} /></div>
              </div>
              <div className="adm-stat">
                <div className="adm-stat-cab"><span>VEHÍCULOS</span><span className="material-symbols-outlined">two_wheeler</span></div>
                <div className="adm-stat-valor">{numero(total)}</div>
                <div className="adm-stat-sub"><b>{numero(sinDuenno)}</b> sin asignar</div>
              </div>
              <div className="adm-stat">
                <div className="adm-stat-cab"><span>CON GPS</span><span className="material-symbols-outlined">satellite_alt</span></div>
                <div className="adm-stat-valor">{cobertura}<small>%</small></div>
                <div className="adm-senal">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <span key={i} className={i < Math.round((cobertura / 100) * 5) ? "on" : ""} />
                  ))}
                  <span className="adm-senal-texto">{numero(conImei)} equipos</span>
                </div>
              </div>
              <div className="adm-stat">
                <div className="adm-stat-cab"><span>ADMINISTRADORES</span><span className="material-symbols-outlined">shield_person</span></div>
                <div className="adm-stat-valor">{String(resumen?.administradores ?? 0).padStart(2, "0")}</div>
                <div className="adm-stat-sub">Con acceso al panel</div>
              </div>
            </div>

            <div className="adm-fila">
              <div className="adm-mapa">
                {!esClaveValida || loadError ? (
                  <div className="adm-mapa-aviso">
                    <span className="material-symbols-outlined">map</span>
                    <div>Mapa no disponible</div>
                    <small>Configura VITE_GOOGLE_MAPS_API_KEY para ver la flota.</small>
                  </div>
                ) : isLoaded ? (
                  <GoogleMap
                    mapContainerClassName="adm-mapa-lienzo"
                    center={CENTRO_DEFAULT}
                    zoom={13}
                    options={OPCIONES_MAPA}
                    onLoad={setMapa}
                    onUnmount={() => setMapa(null)}
                  />
                ) : (
                  <div className="adm-mapa-aviso"><div>Cargando mapa…</div></div>
                )}
                <div className="adm-mapa-degradado" />

                <div className="adm-mapa-cab">
                  <div>
                    <div className="adm-etiqueta adm-etiqueta--acento">MONITOR DE FLOTA</div>
                    <div className="adm-mapa-titulo">Cartagena · en tiempo real</div>
                  </div>
                  <div className="adm-chips">
                    <span className="adm-chip"><span className="adm-chip-punto adm-chip-punto--marcha" />En marcha · {conteo.marcha}</span>
                    <span className="adm-chip"><span className="adm-chip-punto adm-chip-punto--detenido" />Detenido · {conteo.detenido}</span>
                    <span className="adm-chip"><span className="adm-chip-punto adm-chip-punto--sin" />Sin datos · {conteo.sin}</span>
                  </div>
                </div>

                {seleccionado && (
                  <div className="adm-ficha">
                    <div className="adm-ficha-cab">
                      <div>
                        <div className="adm-ficha-placa">{seleccionado.placa}</div>
                        <div className="adm-ficha-sub">{seleccionado.modelo} · {seleccionado.propietario}</div>
                      </div>
                      <button className="adm-icono-btn adm-icono-btn--sm" aria-label="Cerrar" onClick={() => setSeleccion(null)}>
                        <span className="material-symbols-outlined">close</span>
                      </button>
                    </div>
                    <div className="adm-ficha-datos">
                      <div>
                        <div className="adm-etiqueta">VELOCIDAD</div>
                        <div className="adm-ficha-vel">{seleccionado.pos?.vel ?? 0}<small> km/h</small></div>
                      </div>
                      <div>
                        <div className="adm-etiqueta">ESTADO</div>
                        <div className={`adm-ficha-estado adm-tono--${seleccionado.estado}`}>{ESTADOS[seleccionado.estado]}</div>
                      </div>
                    </div>
                    <div className="adm-ficha-coords">
                      <span>{seleccionado.pos ? `${seleccionado.pos.lat.toFixed(5)}, ${seleccionado.pos.lng.toFixed(5)}` : "—"}</span>
                      <span>{seleccionado.pos ? haceCuanto(seleccionado.pos.fecha, ahora) : "sin reportes"}</span>
                    </div>
                    {seleccionado.pos && (
                      <a
                        className="adm-enlace"
                        href={`https://www.google.com/maps?q=${seleccionado.pos.lat},${seleccionado.pos.lng}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <span className="material-symbols-outlined">location_on</span>VER EN GOOGLE MAPS
                      </a>
                    )}
                  </div>
                )}

                <div className="adm-zoom">
                  <button title="Acercar" onClick={() => mapa && mapa.setZoom(mapa.getZoom() + 1)}>
                    <span className="material-symbols-outlined">add</span>
                  </button>
                  <button title="Alejar" onClick={() => mapa && mapa.setZoom(mapa.getZoom() - 1)}>
                    <span className="material-symbols-outlined">remove</span>
                  </button>
                  <button title="Ver toda la flota" className="acento" onClick={encuadrarFlota}>
                    <span className="material-symbols-outlined">fit_screen</span>
                  </button>
                </div>
              </div>

              <div className="adm-columna">
                <div className="adm-tarjeta">
                  <div className="adm-etiqueta">ESTADO DE LA FLOTA</div>
                  <div className="adm-flota">
                    <div><b>{numero(conImei)}</b><span>Equipos instalados</span></div>
                    <div><b>{cobertura}<small>%</small></b><span>Cobertura</span></div>
                    <div><b>{numero(sinDuenno)}</b><span>Sin asignar</span></div>
                  </div>
                  <div className="adm-flota-pie">
                    <span>GT06 · puerto 9000 TCP</span><span>/socket/gps/{"{imei}"}</span>
                  </div>
                </div>

                <div className="adm-tarjeta adm-gestion">
                  <div className="adm-etiqueta">GESTIÓN</div>
                  {GESTION.map((m) => (
                    <button key={m.titulo} className="adm-gestion-item">
                      <span className="adm-gestion-icono"><span className="material-symbols-outlined">{m.icon}</span></span>
                      <span className="adm-gestion-texto">
                        <b>{m.titulo}</b>
                        <span>{m.desc}</span>
                      </span>
                      <span className="material-symbols-outlined adm-gestion-flecha">chevron_right</span>
                    </button>
                  ))}
                </div>

                <div className="adm-tarjeta adm-inventario">
                  <div className="adm-inventario-titulo">Inventario sin asignar</div>
                  <p>Hay {numero(sinDuenno)} vehículos sin propietario y {numero(sinGps)} sin equipo GPS.</p>
                  <button
                    className="adm-enlace"
                    onClick={() => tablaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                  >
                    REVISAR INVENTARIO<span className="material-symbols-outlined">chevron_right</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="adm-tabla-tarjeta" ref={tablaRef}>
              <div className="adm-tabla-cab">
                <div>
                  <div className="adm-tabla-titulo">Vehículos registrados</div>
                  <div className="adm-tabla-sub">Últimos vehículos dados de alta. Pulsa una fila para ubicarla en el mapa.</div>
                </div>
                <button className="adm-btn-secundario" onClick={exportarCsv} disabled={vehiculos.length === 0}>
                  <span className="material-symbols-outlined">download</span>Exportar CSV
                </button>
              </div>
              <div className="adm-tabla-scroll">
                <div className="adm-tabla">
                  <div className="adm-tabla-fila adm-tabla-fila--cab">
                    <span>PLACA / IMEI</span><span>PROPIETARIO</span><span>MODELO</span><span>ESTADO</span><span>ALTA</span><span className="der">ACCIONES</span>
                  </div>

                  {cargando && vehiculos.length === 0 && <div className="adm-tabla-vacia">Cargando…</div>}

                  {!cargando && vehiculos.length === 0 && (
                    <div className="adm-tabla-vacia">
                      {busqueda ? "Sin resultados para la búsqueda" : "Todavía no hay vehículos registrados"}
                    </div>
                  )}

                  {flota.map((v) => (
                    <div
                      key={v.id}
                      className={`adm-tabla-fila ${seleccion === v.id ? "seleccionada" : ""}`}
                      onClick={() => elegir(v.id)}
                    >
                      <div>
                        <div className="adm-placa">{v.placa}</div>
                        <div className={`adm-imei ${v.imei ? "" : "adm-tono--nogps"}`}>{v.imei || "SIN GPS"}</div>
                      </div>
                      <div className="adm-propietario">
                        <span className="adm-iniciales">{v.propietario === "Sin asignar" ? "—" : iniciales(v.propietario)}</span>
                        <span className="adm-propietario-nombre">{v.propietario}</span>
                      </div>
                      <div className="adm-modelo">{v.modelo} · {v.tipo}</div>
                      <div>
                        <span className={`adm-estado adm-estado--${v.estado}`}>
                          <span className="adm-estado-punto" />{ESTADOS[v.estado]}
                        </span>
                      </div>
                      <div className="adm-alta">
                        {v.creadoEn ? new Date(v.creadoEn).toLocaleDateString("es-CO") : "—"}
                      </div>
                      <div className="der">
                        <button
                          className="adm-btn-fila"
                          onClick={(e) => { e.stopPropagation(); alternarEstadoVehiculo(v.id); }}
                        >
                          {v.activo ? "Desactivar" : "Activar"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="adm-pie">© {new Date().getFullYear()} ROMP GPS TELEMETRY SYSTEMS</div>
          </div>
        </main>
      </div>
    </div>
  );
}
