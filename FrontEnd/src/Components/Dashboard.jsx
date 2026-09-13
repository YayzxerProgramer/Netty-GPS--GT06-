import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { obtenerUsuario, cerrarSesion } from "../Service/sesion";
import { get, patch } from "../Service/api";

import "../Styles/Dashboard.css";

const NavIcon = ({ type }) => {
  const icons = {
    dashboard: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>,
    fleet: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>,
    clients: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
    gps: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" /></svg>,
    analytics: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>,
    user: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
    logout: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>,
    bell: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>,
    settings: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M12 2v2M12 20v2M4.93 19.07l1.41-1.41M19.07 19.07l-1.41-1.41M2 12h2M20 12h2" /></svg>,
    help: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
    search: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>,
    filter: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>,
    plus: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
    arrow: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>,
    download: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>,
    upload: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>,
    chart: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>,
    link: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>,
    box: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /></svg>,
    warn: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
    signal: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1.42 9a16 16 0 0 1 21.16 0" /><path d="M5 12.55a11 11 0 0 1 14.08 0" /><path d="M10.54 17.09l1.46 1.46 1.46-1.46A5 5 0 0 0 10.54 17.09z" /></svg>,
    analytics2: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" /><path d="M13 13l6 6" /></svg>,
  };
  return icons[type] || null;
};

export default function Dashboard() {
  const [activeNav, setActiveNav] = useState("dashboard");
  const navigate = useNavigate();
  const usuario = obtenerUsuario() || "ADMIN";

  // Datos reales del panel. Antes todo el contenido era literal del maquetado:
  // TOTAL CLIENTS 412, GPS INVENTORY 8,924 y dos filas de dispositivos falsos.
  const [resumen, setResumen] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [vehiculos, setVehiculos] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const cargar = useCallback(async (texto = "") => {
    setCargando(true);
    setError(null);
    try {
      const filtro = texto ? `&busqueda=${encodeURIComponent(texto)}` : "";
      const [datosResumen, pagUsuarios, pagVehiculos] = await Promise.all([
        get("/admin/resumen"),
        get(`/admin/usuarios?tamano=10${filtro}`),
        get(`/admin/vehiculos?tamano=10${filtro}`),
      ]);
      setResumen(datosResumen);
      setUsuarios(pagUsuarios.contenido);
      setVehiculos(pagVehiculos.contenido);
    } catch (e) {
      setError(e.message || "No se pudieron cargar los datos");
    } finally {
      setCargando(false);
    }
  }, []);

  // Carga inicial y buscador, en un solo efecto.
  //
  // La espera de 400 ms evita una petición por cada tecla pulsada, y al montar
  // el componente dispara igualmente la primera carga con la búsqueda vacía:
  // por eso no hace falta un segundo useEffect que llame a cargar() al inicio.
  useEffect(() => {
    const id = setTimeout(() => cargar(busqueda), 400);
    return () => clearTimeout(id);
  }, [busqueda, cargar]);

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


  return (
    <>
      <div className="app">
        <div className="topbar">
          <span className="logo">ROMP GPS</span>
          <div className="search">
            <NavIcon type="search" />
            {/* Antes era un <span> con texto muerto: no buscaba nada. */}
            <input
              className="search-input"
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar usuario, placa o IMEI..."
              style={{ background: "transparent", border: "none", outline: "none", color: "inherit", width: "100%" }}
            />
          </div>
          <div className="topbar-right">
            <button className="icon-btn"><NavIcon type="bell" /></button>
            <button className="icon-btn"><NavIcon type="settings" /></button>
            <button className="icon-btn"><NavIcon type="help" /></button>
            <div className="user-info">
              <div className="user-text">
                <div className="user-name">{usuario.toUpperCase()}</div>
                <div className="user-status">SESIÓN ACTIVA</div>
              </div>
              <div className="avatar">{usuario.charAt(0).toUpperCase()}</div>
            </div>
          </div>
        </div>

        <div className="layout">
          <div className="sidebar">
            <div className="sidebar-user">
              <div className="sidebar-user-icon">
                <NavIcon type="user" />
                <div>
                  <div className="sidebar-user-name">System </div>
                  <div className="sidebar-user-role">Precision Fleet Control</div>
                </div>
              </div>
            </div>
            <nav className="nav">
              {[
                { id: "dashboard", label: "Dashboard", icon: "dashboard" },
                { id: "fleet", label: "Fleet Monitor", icon: "fleet" },
                { id: "clients", label: "Client Registry", icon: "clients" },
                { id: "gps", label: "GPS Units", icon: "gps" },
                { id: "analytics", label: "Analytics", icon: "analytics" },
              ].map(item => (
                <div key={item.id} className={`nav-item ${activeNav === item.id ? "active" : ""}`} onClick={() => setActiveNav(item.id)}>
                  <NavIcon type={item.icon} />
                  <span>{item.label}</span>
                </div>
              ))}
            </nav>
            <div className="sidebar-bottom">
              <button className="register-btn">
                <NavIcon type="plus" />
                Register New Device
              </button>
              <div className="nav-item" style={{ padding: "10px 0", cursor: "pointer" }} onClick={() => navigate("/configuracion")}><NavIcon type="user" /><span>Mi perfil</span></div>
              <div className="nav-item" style={{ padding: "10px 0", cursor: "pointer" }} onClick={manejarCerrarSesion}><NavIcon type="logout" /><span>Cerrar sesión</span></div>
            </div>
          </div>

          {/* MAIN */}
          <main className="main">
            {/* HEADER */}
            <div className="page-header">
              <div className="status-bar">
                <div className="live-badge"><div className="live-dot" />SYSTEM LIVE</div>
                <span className="uptime">UPTIME: 99.98%</span>
              </div>
              <div className="header-row">
                <div>
                  <h1 className="page-title">Centro de mando</h1>
                  <p className="page-desc">Administracion de usuarios, vehiculos y dispositivos GPS.</p>
                </div>
                <div className="header-meta">
                  <div className="meta-item">
                    <label>VEHICULOS ACTIVOS</label>
                    <span>{numero(resumen?.vehiculosActivos)}</span>
                  </div>
                  <div className="meta-item">
                    <label>ACTUALIZAR</label>
                    <span
                      onClick={() => cargar(busqueda)}
                      style={{ cursor: "pointer", textDecoration: "underline" }}
                    >
                      Recargar
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div style={{
                background: "rgba(220,38,38,0.15)", border: "1px solid rgba(220,38,38,0.4)",
                color: "#fca5a5", padding: "12px 16px", borderRadius: 8, marginBottom: 16,
              }}>
                {error}
              </div>
            )}

            {/* STATS */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">USUARIOS</div>
                <div className="stat-icon"><NavIcon type="clients" /></div>
                <div className="stat-value">{numero(resumen?.totalUsuarios)}</div>
                <div className="stat-sub">
                  <span className="stat-change">{numero(resumen?.usuariosActivos)} activos</span>
                </div>
                <div className="progress-bar" style={{ marginTop: 8 }}>
                  <div
                    className="progress-fill"
                    style={{
                      width: resumen?.totalUsuarios
                        ? `${Math.round((resumen.usuariosActivos / resumen.totalUsuarios) * 100)}%`
                        : "0%",
                    }}
                  />
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">VEHICULOS</div>
                <div className="stat-icon"><NavIcon type="box" /></div>
                <div className="stat-value">{numero(resumen?.totalVehiculos)}</div>
                <div className="stat-sub">
                  <span className="in-stock">{numero(resumen?.vehiculosSinDuenno)}</span>&nbsp; sin asignar
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">CON GPS</div>
                <div className="stat-icon"><NavIcon type="signal" /></div>
                <div className="stat-value">
                  {resumen?.totalVehiculos
                    ? Math.round((resumen.vehiculosConImei / resumen.totalVehiculos) * 100)
                    : 0}
                  <span style={{ fontSize: 18 }}>%</span>
                </div>
                <div className="signal-dots">
                  {[0, 1, 2, 3, 4].map((i) => {
                    const proporcion = resumen?.totalVehiculos
                      ? resumen.vehiculosConImei / resumen.totalVehiculos
                      : 0;
                    return <div key={i} className={`signal-dot ${i < Math.round(proporcion * 5) ? "on" : "off"}`} />;
                  })}
                  <span className="latency" style={{ marginLeft: 6 }}>
                    {numero(resumen?.vehiculosConImei)} equipos
                  </span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">ADMINISTRADORES</div>
                <div className="stat-icon"><NavIcon type="warn" /></div>
                <div className="alert-value">
                  {String(resumen?.administradores ?? 0).padStart(2, "0")}
                </div>
                <div className="alert-sub">Con acceso al panel</div>
              </div>
            </div>

            {/* BOTTOM GRID */}
            <div className="bottom-grid">
              {/* MANAGEMENT */}
              <div className="management-section">
                <div className="section-header">
                  <span>MANAGEMENT</span>
                  <NavIcon type="filter" />
                </div>
                {[
                  { icon: "clients", title: "Client Registry", desc: "Update entity billing & access levels" },
                  { icon: "box", title: "GPS Unit Inventory", desc: "Manage hardware stock and status" },
                  { icon: "link", title: "Vehicle-User Linking", desc: "Mapping hardware to active personnel" },
                ].map((item, i) => (
                  <div key={i} className="mgmt-card">
                    <div className="mgmt-icon"><NavIcon type={item.icon} /></div>
                    <div className="mgmt-text">
                      <div className="mgmt-title">{item.title}</div>
                      <div className="mgmt-desc">{item.desc}</div>
                    </div>
                    <div className="mgmt-arrow"><NavIcon type="arrow" /></div>
                  </div>
                ))}
                <div className="fleet-report">
                  <div className="fleet-report-title">Fleet Integrity Report</div>
                  <div className="fleet-report-desc">A weekly overview of signal stability across all regions is ready for review.</div>
                  <button className="download-btn"><NavIcon type="download" /> DOWNLOAD PDF</button>
                  <div className="report-icon">
                    <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
                  </div>
                </div>
              </div>

              {/* TELEMETRY */}
              <div className="telemetry-panel">
                <div className="telemetry-header">
                  <div className="telemetry-title">
                    <NavIcon type="analytics" />
                    TELEMETRIC INTELLIGENCE DASHBOARD
                  </div>
                  <div className="telemetry-dots">
                    <div className="t-dot t-dot-1" />
                    <div className="t-dot t-dot-2" />
                    <div className="t-dot t-dot-3" />
                  </div>
                </div>
                <div className="telemetry-stats">
                  <div className="tstat">
                    <div className="tstat-label">SIGNAL HEATMAP</div>
                    <div className="signal-bars">
                      {[14, 22, 18, 28, 20].map((h, i) => (
                        <div key={i} className="sbar" style={{ height: `${h}px` }} />
                      ))}
                    </div>
                  </div>
                  <div className="tstat">
                    <div className="tstat-label">BATTERY HEALTH</div>
                    <div><span className="tstat-value">88.4%</span> <span className="tstat-unit">Avg</span></div>
                  </div>
                  <div className="tstat">
                    <div className="tstat-label">MOVEMENT VELOCITY</div>
                    <div><span className="tstat-value">42</span> <span className="tstat-unit">km/h</span></div>
                  </div>
                </div>
                <div className="telemetry-center">
                  <div className="analytics-icon-wrap">
                    <NavIcon type="analytics2" />
                  </div>
                  <div className="analytics-title">Interactive Fleet Analytics</div>
                  <div className="analytics-desc">Connect your live telemetry feed to visualize real-time asset movement, fuel efficiency, and route optimization across global jurisdictions.</div>
                  <button className="init-btn">Initialize Power BI Integration</button>
                </div>
                <div className="telemetry-footer">
                  <div className="telemetry-coord"><label>LAT ALIGNMENT</label><span>34.8522° N</span></div>
                  <div className="telemetry-coord"><label>LONG ALIGNMENT</label><span>118.2437° W</span></div>
                </div>
              </div>
            </div>

            {/* DEPLOYMENTS */}
            <div className="deployments">
              <div className="deployments-header">
                <div>
                  <div className="deployments-title">Vehiculos registrados</div>
                  <div className="deployments-sub">Ultimos vehiculos dados de alta en el sistema.</div>
                </div>
                {/* Antes no tenia onClick: el boton no hacia nada. */}
                <button className="export-btn" onClick={exportarCsv}>
                  <NavIcon type="upload" /> Exportar CSV
                </button>
              </div>
              <div className="table-header">
                <span>PLACA / IMEI</span>
                <span>PROPIETARIO</span>
                <span>MODELO</span>
                <span>ESTADO</span>
                <span>ALTA</span>
                <span>ACCIONES</span>
              </div>
              {cargando && <div className="table-row"><div>Cargando...</div></div>}

              {!cargando && vehiculos.length === 0 && (
                <div className="table-row">
                  <div>{busqueda ? "Sin resultados para la busqueda" : "Todavia no hay vehiculos registrados"}</div>
                </div>
              )}

              {vehiculos.map((v) => {
                const duenno = usuarios.find((u) => u.id === v.id_usuario);
                const nombre = duenno ? `${duenno.nombre} ${duenno.apellido || ""}`.trim() : "Sin asignar";
                return (
                  <div key={v.id} className="table-row">
                    <div>
                      <div className="device-id">{v.placa}</div>
                      <div className="device-type">{v.imei || "SIN GPS"}</div>
                    </div>
                    <div className="client-cell">
                      <div className="client-avatar">{nombre.slice(0, 2).toUpperCase()}</div>
                      <span className="client-name">{nombre}</span>
                    </div>
                    <div className="region">{v.modelo} - {v.tipo}</div>
                    <div className="status-badge">
                      <div className={`status-dot ${v.activo ? "operational" : ""}`} />
                      <span className="status-op">{v.activo ? "ACTIVO" : "INACTIVO"}</span>
                    </div>
                    <div className="sync-time">
                      {v.creadoEn ? new Date(v.creadoEn).toLocaleString("es-CO") : "-"}
                    </div>
                    <div className="row-actions">
                      <button
                        onClick={() => alternarEstadoVehiculo(v.id)}
                        style={{ background: "none", border: "none", color: "inherit", cursor: "pointer" }}
                        title={v.activo ? "Desactivar" : "Activar"}
                      >
                        {v.activo ? "Desactivar" : "Activar"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="page-footer">© 2024 ROMP GPS TELEMETRY SYSTEMS</div>
          </main>
        </div>
      </div>
    </>
  );
}
