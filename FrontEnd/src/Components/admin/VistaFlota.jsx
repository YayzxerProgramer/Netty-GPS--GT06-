/**
 * Fleet Monitor — estado en vivo de los equipos con GPS.
 *
 * Combina dos fuentes: la última posición conocida (REST, al entrar) y las
 * tramas que van llegando por WebSocket. Sin la primera, la pantalla queda
 * vacía hasta que un dispositivo emite; sin la segunda, no se actualiza.
 */
import { useState, useEffect, useCallback } from "react";
import { get } from "../../Service/api";
import { useFlotaSocket } from "../../Service/GpsDataService";
import NavIcon from "./Iconos";
import { Aviso, Cargando, Vacio } from "./Comunes";
import { haceCuanto, fechaHora, numero } from "./formato";

export default function VistaFlota({ busqueda }) {
  const [vehiculos, setVehiculos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [ultimas, setUltimas] = useState({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [seleccionado, setSeleccionado] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const parametros = new URLSearchParams({ tamano: "100", activo: "true" });
      if (busqueda) parametros.set("busqueda", busqueda);

      const [pagVehiculos, pagUsuarios] = await Promise.all([
        get(`/admin/vehiculos?${parametros}`),
        get("/admin/usuarios?tamano=200"),
      ]);

      const conGps = pagVehiculos.contenido.filter((v) => v.imei);
      setVehiculos(conGps);
      setUsuarios(pagUsuarios.contenido);

      // Un 404 aquí es normal: el equipo está dado de alta pero todavía no ha
      // emitido ninguna trama. Por eso se resuelve a null en vez de propagar.
      const resultados = await Promise.all(
        conGps.map((v) =>
          get(`/gps/ultima-posicion/${v.imei}`)
            .then((posicion) => [v.imei, posicion])
            .catch(() => [v.imei, null]),
        ),
      );
      setUltimas(Object.fromEntries(resultados));
    } catch (e) {
      setError(e.message || "No se pudo cargar la flota");
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

  const { posiciones, connected, error: errorSocket } = useFlotaSocket(vehiculos.map((v) => v.imei));

  // La trama en vivo pisa a la histórica; si aún no ha llegado ninguna, se
  // mantiene la que vino por REST.
  const posicionDe = (imei) => posiciones[imei] || ultimas[imei] || null;

  const nombreDe = (idUsuario) => {
    const duenno = usuarios.find((u) => u.id === idUsuario);
    return duenno ? `${duenno.nombre} ${duenno.apellido || ""}`.trim() : "Sin asignar";
  };

  const enMovimiento = (posicion) => posicion && posicion.gpsValido && posicion.velocidad > 0;

  const moviendose = vehiculos.filter((v) => enMovimiento(posicionDe(v.imei))).length;
  const emitiendo = vehiculos.filter((v) => posicionDe(v.imei)).length;
  const detalle = seleccionado ? posicionDe(seleccionado.imei) : null;

  const columnas = "170px 180px 190px 130px 150px 1fr";

  return (
    <>
      <div className="page-header">
        <div className="status-bar">
          <div className="live-badge">
            <div className={`live-dot ${connected ? "" : "caido"}`} />
            {connected ? "TELEMETRÍA EN VIVO" : "SIN CONEXIÓN EN VIVO"}
          </div>
          <span className="uptime">{emitiendo} de {vehiculos.length} equipos con datos</span>
        </div>
        <div className="header-row">
          <div>
            <h1 className="page-title">Fleet Monitor</h1>
            <p className="page-desc">Última posición conocida de cada equipo GT06 activo.</p>
          </div>
          <div className="header-meta">
            <div className="meta-item"><label>EN MOVIMIENTO</label><span>{moviendose}</span></div>
            <div className="meta-item"><label>DETENIDOS</label><span>{emitiendo - moviendose}</span></div>
            <div className="meta-item">
              <label>ACTUALIZAR</label>
              <span onClick={cargar} style={{ cursor: "pointer", textDecoration: "underline" }}>Recargar</span>
            </div>
          </div>
        </div>
      </div>

      <Aviso texto={error} alCerrar={() => setError(null)} />
      {errorSocket && <Aviso texto={`Telemetría en vivo: ${errorSocket}`} tipo="aviso" />}

      <div className="deployments">
        <div className="deployments-header">
          <div>
            <div className="deployments-title">Equipos en seguimiento</div>
            <div className="deployments-sub">Solo vehículos activos con IMEI asignado.</div>
          </div>
        </div>

        <div className="table-header" style={{ gridTemplateColumns: columnas }}>
          <span>PLACA / IMEI</span>
          <span>PROPIETARIO</span>
          <span>COORDENADAS</span>
          <span>VELOCIDAD</span>
          <span>ÚLTIMO REPORTE</span>
          <span>ESTADO</span>
        </div>

        {cargando && <Cargando texto="Consultando posiciones..." />}

        {!cargando && vehiculos.length === 0 && (
          <Vacio texto={busqueda
            ? "Ningún equipo coincide con la búsqueda"
            : "No hay vehículos activos con IMEI. Asigna un equipo desde GPS Units."} />
        )}

        {!cargando && vehiculos.map((v) => {
          const posicion = posicionDe(v.imei);
          const movimiento = enMovimiento(posicion);
          return (
            <div
              key={v.id}
              className={`table-row fila-pulsable ${seleccionado?.id === v.id ? "fila-activa" : ""}`}
              style={{ gridTemplateColumns: columnas }}
              onClick={() => setSeleccionado(seleccionado?.id === v.id ? null : v)}
            >
              <div>
                <div className="device-id">{v.placa}</div>
                <div className="device-type">{v.imei}</div>
              </div>
              <div className="client-cell">
                <div className="client-avatar">{nombreDe(v.id_usuario).slice(0, 2).toUpperCase()}</div>
                <span className="client-name">{nombreDe(v.id_usuario)}</span>
              </div>
              <div className="coordenadas">
                {posicion
                  ? `${posicion.latitud.toFixed(5)}, ${posicion.longitud.toFixed(5)}`
                  : <span className="device-type">sin reportes</span>}
              </div>
              <div>
                <span className="tstat-value" style={{ fontSize: 16 }}>
                  {posicion ? numero(posicion.velocidad) : "—"}
                </span>
                {posicion && <span className="tstat-unit"> km/h</span>}
              </div>
              <div className="sync-time">{haceCuanto(posicion?.registradoEn)}</div>
              <div className="status-badge">
                <div className={`status-dot ${movimiento ? "operational" : ""} ${posicion ? "" : "apagado"}`} />
                <span className="status-op">
                  {!posicion ? "SIN DATOS" : movimiento ? "EN MARCHA" : "DETENIDO"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {detalle && (
        <div className="telemetry-panel panel-detalle">
          <div className="telemetry-header">
            <div className="telemetry-title">
              <NavIcon type="pin" />
              {seleccionado.placa} · {seleccionado.modelo} {seleccionado.tipo}
            </div>
            <button className="icon-btn" onClick={() => setSeleccionado(null)} aria-label="Cerrar detalle">
              <NavIcon type="close" />
            </button>
          </div>
          <div className="telemetry-stats">
            <div className="tstat">
              <div className="tstat-label">LATITUD</div>
              <div><span className="tstat-value">{detalle.latitud.toFixed(6)}</span></div>
            </div>
            <div className="tstat">
              <div className="tstat-label">LONGITUD</div>
              <div><span className="tstat-value">{detalle.longitud.toFixed(6)}</span></div>
            </div>
            <div className="tstat">
              <div className="tstat-label">VELOCIDAD</div>
              <div><span className="tstat-value">{numero(detalle.velocidad)}</span> <span className="tstat-unit">km/h</span></div>
            </div>
            <div className="tstat">
              <div className="tstat-label">SEÑAL GPS</div>
              <div><span className="tstat-value">{detalle.gpsValido ? "OK" : "SIN FIJAR"}</span></div>
            </div>
            <div className="tstat">
              <div className="tstat-label">CONTACTO (ACC)</div>
              <div><span className="tstat-value">{detalle.acc ? "ON" : "OFF"}</span></div>
            </div>
            <div className="tstat">
              <div className="tstat-label">CORTE DE MOTOR</div>
              <div><span className="tstat-value">{detalle.corteMotor ? "ACTIVO" : "NO"}</span></div>
            </div>
          </div>
          <div className="telemetry-footer">
            <div className="telemetry-coord">
              <label>HORA DEL DISPOSITIVO</label>
              <span>{fechaHora(detalle.registradoEn)}</span>
            </div>
            <div className="telemetry-coord">
              <label>RECIBIDO EN SERVIDOR</label>
              <span>{fechaHora(detalle.creadosEn)}</span>
            </div>
            <a
              className="download-btn"
              href={`https://www.google.com/maps?q=${detalle.latitud},${detalle.longitud}`}
              target="_blank"
              rel="noreferrer"
            >
              <NavIcon type="pin" size={12} /> VER EN EL MAPA
            </a>
          </div>
        </div>
      )}
    </>
  );
}
