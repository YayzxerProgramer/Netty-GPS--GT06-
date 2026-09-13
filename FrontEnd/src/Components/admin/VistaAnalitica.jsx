/**
 * Analytics — métricas derivadas de los datos reales del sistema.
 *
 * Todo lo que se muestra aquí sale de /admin/resumen y de los listados. No hay
 * valores de maquetado: si un dato no existe todavía, la tarjeta lo dice en
 * lugar de enseñar un número inventado.
 */
import { useState, useEffect, useCallback } from "react";
import { get } from "../../Service/api";
import NavIcon from "./Iconos";
import { Aviso, Cargando } from "./Comunes";
import { numero } from "./formato";

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** Altas por mes en los últimos seis meses, a partir de las fechas de creación. */
function altasPorMes(registros) {
  const hoy = new Date();
  const cubos = [];

  for (let i = 5; i >= 0; i--) {
    const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    cubos.push({ etiqueta: MESES[fecha.getMonth()], anio: fecha.getFullYear(), mes: fecha.getMonth(), total: 0 });
  }

  registros.forEach((r) => {
    if (!r.creadoEn) return;
    const fecha = new Date(r.creadoEn);
    const cubo = cubos.find((c) => c.mes === fecha.getMonth() && c.anio === fecha.getFullYear());
    if (cubo) cubo.total++;
  });

  return cubos;
}

function Barras({ datos, titulo, vacio }) {
  const maximo = Math.max(...datos.map((d) => d.total), 1);
  const hayAlgo = datos.some((d) => d.total > 0);

  return (
    <div className="tarjeta-grafico">
      <div className="section-header"><span>{titulo}</span></div>
      {!hayAlgo ? (
        <div className="grafico-vacio">{vacio}</div>
      ) : (
        <div className="grafico-barras">
          {datos.map((d, i) => (
            <div key={i} className="barra-columna">
              <div className="barra-valor">{d.total || ""}</div>
              <div className="barra" style={{ height: `${Math.max((d.total / maximo) * 100, 2)}%` }} />
              <div className="barra-etiqueta">{d.etiqueta}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Reparto({ titulo, partes, total }) {
  return (
    <div className="tarjeta-grafico">
      <div className="section-header"><span>{titulo}</span></div>
      {total === 0 ? (
        <div className="grafico-vacio">Todavía no hay registros.</div>
      ) : (
        <div className="reparto">
          {partes.map((p) => {
            const porcentaje = Math.round((p.valor / total) * 100);
            return (
              <div key={p.etiqueta} className="reparto-fila">
                <div className="reparto-cabecera">
                  <span className="reparto-etiqueta">{p.etiqueta}</span>
                  <span className="reparto-cifra">{numero(p.valor)} · {porcentaje}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${porcentaje}%`, background: p.color }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function VistaAnalitica() {
  const [resumen, setResumen] = useState(null);
  const [vehiculos, setVehiculos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [datosResumen, pagVehiculos, pagUsuarios] = await Promise.all([
        get("/admin/resumen"),
        get("/admin/vehiculos?tamano=200"),
        get("/admin/usuarios?tamano=200"),
      ]);
      setResumen(datosResumen);
      setVehiculos(pagVehiculos.contenido);
      setUsuarios(pagUsuarios.contenido);
    } catch (e) {
      setError(e.message || "No se pudieron cargar las métricas");
    } finally {
      setCargando(false);
    }
  }, []);

  // La espera de 300 ms evita una petición por cada tecla del buscador, y
  // mantiene el setState fuera del cuerpo síncrono del efecto, que dispara
  // renders en cascada.
  useEffect(() => {
    const id = setTimeout(cargar, 300);
    return () => clearTimeout(id);
  }, [cargar]);

  if (cargando) {
    return (
      <>
        <div className="page-header">
          <div className="header-row">
            <div>
              <h1 className="page-title">Analytics</h1>
              <p className="page-desc">Métricas calculadas sobre los datos del sistema.</p>
            </div>
          </div>
        </div>
        <Cargando texto="Calculando métricas..." />
      </>
    );
  }

  const cobertura = resumen?.totalVehiculos
    ? Math.round((resumen.vehiculosConImei / resumen.totalVehiculos) * 100)
    : 0;

  const porTipo = ["CARRO", "MOTO"].map((tipo, i) => ({
    etiqueta: tipo,
    valor: vehiculos.filter((v) => v.tipo === tipo).length,
    color: i === 0 ? "var(--green)" : "var(--accent)",
  }));

  const colorRol = { ADMIN: "var(--warn)", USER: "var(--green)", VIEWER: "var(--text3)" };
  const porRol = ["ADMIN", "USER", "VIEWER"].map((rol) => ({
    etiqueta: rol,
    valor: usuarios.filter((u) => u.rol === rol).length,
    color: colorRol[rol],
  }));

  // Propietarios con más vehículos a su nombre.
  const conteoPorDuenno = new Map();
  vehiculos.forEach((v) => {
    if (!v.id_usuario) return;
    conteoPorDuenno.set(v.id_usuario, (conteoPorDuenno.get(v.id_usuario) || 0) + 1);
  });
  const ranking = [...conteoPorDuenno.entries()]
    .map(([id, total]) => {
      const duenno = usuarios.find((u) => u.id === id);
      return { nombre: duenno ? duenno.usuario : "desconocido", total };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return (
    <>
      <div className="page-header">
        <div className="header-row">
          <div>
            <h1 className="page-title">Analytics</h1>
            <p className="page-desc">Métricas calculadas sobre los datos del sistema.</p>
          </div>
          <div className="header-meta">
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
          <div className="stat-label">COBERTURA GPS</div>
          <div className="stat-icon"><NavIcon type="signal" /></div>
          <div className="stat-value">{cobertura}<span style={{ fontSize: 18 }}>%</span></div>
          <div className="stat-sub">
            <span className="stat-change">{numero(resumen?.vehiculosConImei)} de {numero(resumen?.totalVehiculos)}</span>
          </div>
          <div className="progress-bar" style={{ marginTop: 8 }}>
            <div className="progress-fill" style={{ width: `${cobertura}%` }} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">VEHÍCULOS ACTIVOS</div>
          <div className="stat-icon"><NavIcon type="box" /></div>
          <div className="stat-value">{numero(resumen?.vehiculosActivos)}</div>
          <div className="stat-sub">
            <span className="in-stock">{numero((resumen?.totalVehiculos ?? 0) - (resumen?.vehiculosActivos ?? 0))}</span>
            &nbsp; inactivos
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">SIN PROPIETARIO</div>
          <div className="stat-icon"><NavIcon type="link" /></div>
          <div className="stat-value">{numero(resumen?.vehiculosSinDuenno)}</div>
          <div className="stat-sub">
            <span className="stat-change">Pendientes de asignar</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">USUARIOS ACTIVOS</div>
          <div className="stat-icon"><NavIcon type="clients" /></div>
          <div className="stat-value">{numero(resumen?.usuariosActivos)}</div>
          <div className="stat-sub">
            <span className="in-stock">{numero(resumen?.administradores)}</span>&nbsp; administradores
          </div>
        </div>
      </div>

      <div className="rejilla-graficos">
        <Barras
          titulo="ALTAS DE VEHÍCULOS · ÚLTIMOS 6 MESES"
          datos={altasPorMes(vehiculos)}
          vacio="Sin altas en los últimos seis meses."
        />
        <Barras
          titulo="ALTAS DE USUARIOS · ÚLTIMOS 6 MESES"
          datos={altasPorMes(usuarios)}
          vacio="Sin altas en los últimos seis meses."
        />
        <Reparto titulo="USUARIOS POR ROL" partes={porRol} total={usuarios.length} />
        <Reparto titulo="VEHÍCULOS POR TIPO" partes={porTipo} total={vehiculos.length} />
      </div>

      <div className="deployments">
        <div className="deployments-header">
          <div>
            <div className="deployments-title">Propietarios con más vehículos</div>
            <div className="deployments-sub">Sobre los {numero(vehiculos.length)} vehículos cargados.</div>
          </div>
        </div>
        {ranking.length === 0 ? (
          <div className="estado-vacio">Ningún vehículo tiene propietario asignado todavía.</div>
        ) : (
          ranking.map((r) => (
            <div key={r.nombre} className="table-row" style={{ gridTemplateColumns: "240px 1fr 80px" }}>
              <div className="client-cell">
                <div className="client-avatar">{r.nombre.slice(0, 2).toUpperCase()}</div>
                <span className="client-name">{r.nombre}</span>
              </div>
              <div className="progress-bar" style={{ alignSelf: "center" }}>
                <div className="progress-fill" style={{ width: `${(r.total / ranking[0].total) * 100}%` }} />
              </div>
              <div className="device-id" style={{ textAlign: "right" }}>{r.total}</div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
