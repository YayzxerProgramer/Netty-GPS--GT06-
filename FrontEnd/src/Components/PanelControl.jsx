import { useState, useEffect } from "react";
import MapaGPS from "./Mapa";
import { useGpsSocket } from "../Service/GpsDataService";
import { Link } from "react-router-dom";
import "../Styles/PanelControl.css";
const IMEI = "0863874084559974";

const sparkHeights = ["40%", "60%", "55%", "80%", "95%", "70%", "85%"];

export default function PanelControl() {
    const [time, setTime] = useState("14:22:05");

    // Conectamos el WebSocket — todos los datos vienen de aquí
    const { position, connected } = useGpsSocket(IMEI);

    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            setTime(now.toLocaleTimeString("es-MX", { hour12: false }));
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // Formateamos coordenadas con fallback si no hay señal aún
    const lat = position ? position.latitud.toFixed(4) : "---";
    const lng = position ? position.longitud.toFixed(4) : "---";
    const velocidad = position ? position.velocidad : 0;
    const motorEncendido = position ? position.acc : false;
    const gpsValido = position ? position.gpsValido : false;

    return (
        <div className="romp-root">

            {/* Barra de navegación superior */}
            <nav className="barra-nav-superior">
                <div className="marca-logo">
                    <span className="material-symbols-outlined icono-logo">explore</span>
                    ROMP GPS
                </div>
                <button className="boton-clientes">
                    <Link to="/login">Cerrar Sesión</Link>
                </button>
            </nav>

            {/* Contenedor principal */}
            <div className="contenedor-principal">

                {/* Barra lateral */}
                <aside className="barra-lateral">

                    {/* Perfil de usuario */}
                    <div className="seccion-perfil">
                        <div className="fila-perfil">
                            <div className="avatar-perfil">
                                <img
                                    alt="Perfil de usuario"
                                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuAY2LUZy8-2hH4EHpzk3fYPcKWGWO-KFLJi026AWK5hVL8IclrSHzl6nHY3IZDOrMGLfe0y5DCDS_FbOuiQ876MODJCixKpcuhqt9IP42G9ZbNMWt3Bdr3dMicj7oIubOipTqySE4VggkfaXCfjOuO0VP9fVLkKxVRfzrtRfRQW7ZCt9glPMhZinrCn3jhl-cG33Ww0CnjKHUBe4ScbYvWaYi-tMR7xoPPQbShkWGwwFivAB0UuhNoOHFCQlvudSkPAz5W2aANPLQE"
                                />
                            </div>
                            <div className="datos-perfil">
                                <h2>Fleet Monitor</h2>
                                <p>Unidades activas: 1</p>
                            </div>
                        </div>
                        <button className="boton-rastrear">Track Now</button>
                    </div>

                    {/* Lista vehículos */}
                    <div className="lista-vehiculos">

                        <div className="elemento-activo">
                            <div className="fila-icono">
                                <span className="material-symbols-outlined icono-nav">near_me</span>
                                <span>Live Location</span>
                            </div>

                            <div className="detalle-activo">
                                <p className="etiqueta-unidad">
                                    IMEI: {IMEI}
                                </p>

                                <div className="fila-velocidad">
                                    {/* Indicador de conexión y velocidad dinámicos */}
                                    <span className="indicador-velocidad">
                                        <span
                                            className="punto-pulsante"
                                            style={{
                                                backgroundColor: connected ? "#86a17d" : "#a05540"
                                            }}
                                        />
                                        {connected
                                            ? `${velocidad} km/h`
                                            : "Desconectado"
                                        }
                                    </span>
                                    <span className="hora-registro">{time}</span>
                                </div>
                            </div>
                        </div>

                        {/* Tab corte motor */}
                        <div className="tab-navegacion">
                            <span className="material-symbols-outlined icono-tab">
                                power_settings_new
                            </span>
                            <span className="texto-tab">Power Cut</span>
                        </div>

                        {/* Flota */}
                        <div className="seccion-flota">
                            <h3 className="titulo-flota">Flota Activa</h3>

                            <div className="tarjetas-vehiculos">

                                {/* Tarjeta dinámica del GPS conectado */}
                                <div className="tarjeta-vehiculo">
                                    <div className="encabezado-tarjeta">
                                        <span className="nombre-vehiculo">GPS-{IMEI.slice(-4)}</span>
                                        <span className={`etiqueta-estado ${connected ? "etiqueta-en-mapa" : "etiqueta-detenido"}`}>
                                            {connected ? "EN VIVO" : "OFFLINE"}
                                        </span>
                                    </div>

                                    <div className="grilla-datos">
                                        <div className="dato-item">
                                            <span className="dato-etiqueta">Motor</span>
                                            <span className={motorEncendido ? "dato-valor-activo" : "dato-valor-error"}>
                                                {motorEncendido ? "Encendido" : "Apagado"}
                                            </span>
                                        </div>

                                        <div className="dato-item">
                                            <span className="dato-etiqueta">GPS</span>
                                            <span className={gpsValido ? "dato-valor-normal" : "dato-valor-apagado"}>
                                                {gpsValido ? "Válido" : "Sin señal"}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>

                    {/* Footer sidebar */}
                    <div className="pie-barra-lateral">
                        <div className="tab-pie">
                            <span className="material-symbols-outlined icono-pie">settings</span>
                            <span className="texto-pie">
                                <Link to="/configuracion">Configuración</Link>
                            </span>
                        </div>
                        <div className="tab-pie">
                            <span className="material-symbols-outlined icono-pie">help</span>
                            <span className="texto-pie">Soporte</span>
                        </div>
                    </div>

                </aside>

                {/* Main — mapa real reemplaza la imagen estática */}
                <main className="area-principal">
                    <div className="fondo-mapa">

                        {/* MapaGPS toma todo el espacio disponible */}
                        <div className="contenedor-mapa-real">
                            <MapaGPS />
                        </div>

                        <div className="superposicion-degradado"></div>

                        {/* HUD con datos dinámicos */}
                        <div className="panel-hud">

                            <div className="tarjeta-telemetria">
                                <div className="encabezado-telemetria">
                                    <span className="titulo-telemetria">Salud Global</span>
                                    <span className="subtitulo-telemetria">Tiempo real</span>
                                </div>

                                <div className="metricas-telemetria">

                                    <div className="fila-metrica">
                                        <div className="encabezado-metrica">
                                            <span className="nombre-metrica">Estabilidad de señal</span>
                                            <span className="valor-metrica">
                                                {connected ? "98%" : "0%"}
                                            </span>
                                        </div>
                                        <div className="barra-progreso">
                                            <div
                                                className="relleno-progreso"
                                                style={{ width: connected ? "98%" : "0%" }}
                                            />
                                        </div>
                                    </div>

                                    <div className="fila-velocidad-hud">
                                        <div className="bloque-velocidad">
                                            <p className="etiqueta-velocidad">Velocidad actual</p>
                                            {/* Velocidad dinámica desde el WebSocket */}
                                            <p className="valor-velocidad">
                                                {velocidad}
                                                <span className="unidad-velocidad"> km/h</span>
                                            </p>
                                        </div>

                                        <div className="contenedor-sparkline">
                                            <div className="barras-sparkline">
                                                {sparkHeights.map((h, i) => (
                                                    <div key={i} className="barra-spark" style={{ height: h }} />
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </div>

                            {/* Coordenadas dinámicas desde el WebSocket */}
                            <div className="panel-coordenadas">
                                <div className="fila-coordenadas">
                                    <span>LAT: {lat}°</span>
                                    <span>LNG: {lng}°</span>
                                </div>
                                <div className="fila-coordenadas">
                                    <span>IMEI: {IMEI.slice(-8)}</span>
                                    <span>GPS: {gpsValido ? "ACTIVO" : "INACTIVO"}</span>
                                </div>
                            </div>

                        </div>

                        <div className="pie-mapa-izq">
                            ROMP_NAV_SYSTEM_v4.2.1 // SECTOR_G12
                        </div>
                        <div className="pie-mapa-der">
                            ENCRYPTED_SIGNAL_LOCK // 0xFF2A
                        </div>

                    </div>
                </main>

            </div>
        </div>
    );
}