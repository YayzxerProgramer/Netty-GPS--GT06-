/**
 * Centro de mando — la vista de entrada del panel.
 *
 * Era el cuerpo de Dashboard.jsx. Se extrajo al añadir el resto de vistas:
 * Dashboard.jsx se quedó con el armazón (barra superior, lateral y enrutado
 * interno) y cada vista vive en su propio archivo.
 */
import { useState, useEffect, useCallback } from "react";
import { get, patch } from "../../Service/api";
import NavIcon from "./Iconos";
import { Aviso, Cargando, Vacio, Insignia } from "./Comunes";
import { fechaHora, numero } from "./formato";

export default function VistaResumen({ busqueda, irA }) {
  const [resumen, setResumen] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [vehiculos, setVehiculos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const filtro = busqueda ? `&busqueda=${encodeURIComponent(busqueda)}` : "";
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
  }, [busqueda]);

  // La espera de 300 ms evita una petición por cada tecla del buscador, y
  // mantiene el setState fuera del cuerpo síncrono del efecto, que dispara
  // renders en cascada.
  useEffect(() => {
    const id = setTimeout(cargar, 300);
    return () => clearTimeout(id);
  }, [cargar]);

  const alternarEstadoVehiculo = async (id) => {
    try {
      await patch(`/admin/vehiculos/${id}/estado`);
      cargar();
    } catch (e) {
      setError(e.message);
    }
  };

  const exportarCsv = () => {
    const cabecera = "imei,placa,modelo,tipo,activo,creadoEn";
    const filas = vehiculos.map((v) =>
      [v.imei || "", v.placa, v.modelo, v.tipo, v.activo, v.creadoEn].join(","));
    const enlace = document.createElement("a");
    enlace.href = URL.createObjectURL(new Blob([[cabecera, ...filas].join("\n")], { type: "text/csv" }));
    enlace.download = `vehiculos-${new Date().toISOString().slice(0, 10)}.csv`;
    enlace.click();
    URL.revokeObjectURL(enlace.href);
  };

  const cobertura = resumen?.totalVehiculos
    ? Math.round((resumen.vehiculosConImei / resumen.totalVehiculos) * 100)
    : 0;

  const proporcionActivos = resumen?.totalUsuarios
    ? Math.round((resumen.usuariosActivos / resumen.totalUsuarios) * 100)
    : 0;

  return (
    <>
      <div className="page-header">
        <div className="status-bar">
          <div className="live-badge"><div className="live-dot" />SYSTEM LIVE</div>
          <span className="uptime">{numero(resumen?.totalVehiculos)} vehículos bajo gestión</span>
        </div>
        <div className="header-row">
          <div>
            <h1 className="page-title">Centro de mando</h1>
            <p className="page-desc">Administración de usuarios, vehículos y dispositivos GPS.</p>
          </div>
          <div className="header-meta">
            <div className="meta-item">
              <label>VEHÍCULOS ACTIVOS</label>
              <span>{numero(resumen?.vehiculosActivos)}</span>
            </div>
            <div className="meta-item">
              <label>ACTUALIZAR</label>
              <span onClick={cargar} style={{ cursor: "pointer", textDecoration: "underline" }}>Recargar</span>
            </div>
          </div>
        </div>
      </div>

      <Aviso texto={error} alCerrar={() => setError(null)} />

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">USUARIOS</div>
          <div className="stat-icon"><NavIcon type="clients" /></div>
          <div className="stat-value">{numero(resumen?.totalUsuarios)}</div>
          <div className="stat-sub">
            <span className="stat-change">{numero(resumen?.usuariosActivos)} activos</span>
          </div>
          <div className="progress-bar" style={{ marginTop: 8 }}>
            <div className="progress-fill" style={{ width: `${proporcionActivos}%` }} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">VEHÍCULOS</div>
          <div className="stat-icon"><NavIcon type="box" /></div>
          <div className="stat-value">{numero(resumen?.totalVehiculos)}</div>
          <div className="stat-sub">
            <span className="in-stock">{numero(resumen?.vehiculosSinDuenno)}</span>&nbsp; sin asignar
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">CON GPS</div>
          <div className="stat-icon"><NavIcon type="signal" /></div>
          <div className="stat-value">{cobertura}<span style={{ fontSize: 18 }}>%</span></div>
          <div className="signal-dots">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className={`signal-dot ${i < Math.round((cobertura / 100) * 5) ? "on" : "off"}`} />
            ))}
            <span className="latency" style={{ marginLeft: 6 }}>
              {numero(resumen?.vehiculosConImei)} equipos
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">ADMINISTRADORES</div>
          <div className="stat-icon"><NavIcon type="warn" /></div>
          <div className="alert-value">{String(resumen?.administradores ?? 0).padStart(2, "0")}</div>
          <div className="alert-sub">Con acceso al panel</div>
        </div>
      </div>

      <div className="bottom-grid">
        <div className="management-section">
          <div className="section-header">
            <span>MANAGEMENT</span>
            <NavIcon type="filter" />
          </div>
          {/* Antes eran tarjetas decorativas: ahora llevan a su vista. */}
          {[
            { icon: "clients", title: "Client Registry", desc: "Altas, roles y acceso de usuarios", destino: "clients" },
            { icon: "box", title: "GPS Unit Inventory", desc: "Equipos GT06 y vehículos", destino: "gps" },
            { icon: "link", title: "Vehicle-User Linking", desc: "Asignar equipos a propietarios", destino: "gps" },
          ].map((item) => (
            <div key={item.title} className="mgmt-card" onClick={() => irA(item.destino)} role="button" tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && irA(item.destino)}>
              <div className="mgmt-icon"><NavIcon type={item.icon} /></div>
              <div className="mgmt-text">
                <div className="mgmt-title">{item.title}</div>
                <div className="mgmt-desc">{item.desc}</div>
              </div>
              <div className="mgmt-arrow"><NavIcon type="arrow" /></div>
            </div>
          ))}
          <div className="fleet-report">
            <div className="fleet-report-title">Inventario sin asignar</div>
            <div className="fleet-report-desc">
              {resumen?.vehiculosSinDuenno
                ? `Hay ${numero(resumen.vehiculosSinDuenno)} vehículos sin propietario y ${numero((resumen.totalVehiculos ?? 0) - (resumen.vehiculosConImei ?? 0))} sin equipo GPS.`
                : "Todos los vehículos registrados tienen propietario asignado."}
            </div>
            <button className="download-btn" onClick={() => irA("gps")}>
              <NavIcon type="arrow" /> REVISAR INVENTARIO
            </button>
            <div className="report-icon">
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
            </div>
          </div>
        </div>

        {/*
          Este panel mostraba BATTERY HEALTH 88.4%, MOVEMENT VELOCITY 42 km/h y
          unas coordenadas de alineación: todo del maquetado. El sistema no
          registra batería, y velocidad y posición son por dispositivo, no un
          promedio global. Se sustituye por recuentos reales y un acceso al
          monitor de flota, que sí muestra telemetría de verdad.
        */}
        <div className="telemetry-panel">
          <div className="telemetry-header">
            <div className="telemetry-title">
              <NavIcon type="analytics" />
              ESTADO DE LA FLOTA
            </div>
            <div className="telemetry-dots">
              <div className="t-dot t-dot-1" />
              <div className="t-dot t-dot-2" />
              <div className="t-dot t-dot-3" />
            </div>
          </div>
          <div className="telemetry-stats">
            <div className="tstat">
              <div className="tstat-label">EQUIPOS INSTALADOS</div>
              <div><span className="tstat-value">{numero(resumen?.vehiculosConImei)}</span></div>
            </div>
            <div className="tstat">
              <div className="tstat-label">COBERTURA</div>
              <div><span className="tstat-value">{cobertura}</span> <span className="tstat-unit">%</span></div>
            </div>
            <div className="tstat">
              <div className="tstat-label">SIN ASIGNAR</div>
              <div><span className="tstat-value">{numero(resumen?.vehiculosSinDuenno)}</span></div>
            </div>
          </div>
          <div className="telemetry-center">
            <div className="analytics-icon-wrap"><NavIcon type="analytics2" /></div>
            <div className="analytics-title">Seguimiento en tiempo real</div>
            <div className="analytics-desc">
              Las posiciones llegan por WebSocket desde los equipos GT06 conectados al servidor TCP.
              El monitor de flota muestra la última posición de cada equipo y la va actualizando.
            </div>
            <button className="init-btn" onClick={() => irA("fleet")}>Abrir monitor de flota</button>
          </div>
          <div className="telemetry-footer">
            <div className="telemetry-coord"><label>ESCUCHA GT06</label><span>puerto 9000 · TCP</span></div>
            <div className="telemetry-coord"><label>DIFUSIÓN</label><span>/socket/gps/&#123;imei&#125;</span></div>
          </div>
        </div>
      </div>

      <div className="deployments">
        <div className="deployments-header">
          <div>
            <div className="deployments-title">Vehículos registrados</div>
            <div className="deployments-sub">Últimos vehículos dados de alta en el sistema.</div>
          </div>
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

        {cargando && <Cargando />}
        {!cargando && vehiculos.length === 0 && (
          <Vacio texto={busqueda ? "Sin resultados para la búsqueda" : "Todavía no hay vehículos registrados"} />
        )}

        {!cargando && vehiculos.map((v) => {
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
              <div className="region">{v.modelo} · {v.tipo}</div>
              <div><Insignia activo={v.activo} /></div>
              <div className="sync-time">{fechaHora(v.creadoEn)}</div>
              <div className="row-actions">
                <button className="accion-texto" onClick={() => alternarEstadoVehiculo(v.id)}>
                  {v.activo ? "Desactivar" : "Activar"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
