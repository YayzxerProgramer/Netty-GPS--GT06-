import { useState, useEffect } from "react";

const sparkHeights = ["40%", "60%", "55%", "80%", "95%", "70%", "85%"];

export default function PanelControl() {
    const [time, setTime] = useState("14:22:05");

    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            setTime(now.toLocaleTimeString("es-MX", { hour12: false }));
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="romp-root">

            {/* Barra de navegación superior */}
            <nav className="barra-nav-superior">
                <div className="marca-logo">
                    <span className="material-symbols-outlined icono-logo">explore</span>
                    ROMP GPS
                </div>
                <button className="boton-clientes">Cerrar Sesión</button>
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
                                <p>Unidades activas: 12</p>
                            </div>
                        </div>

                        <button className="boton-rastrear">Track Now</button>
                    </div>

                    {/* Lista vehículos */}
                    <div className="lista-vehiculos">

                        <div className="elemento-activo">
                            <div className="fila-icono">
                                <span className="material-symbols-outlined icono-nav">
                                    near_me
                                </span>
                                <span>Live Location</span>
                            </div>

                            <div className="detalle-activo">
                                <p className="etiqueta-unidad">
                                    Unidad #8821 – Ford F-150
                                </p>

                                <div className="fila-velocidad">
                                    <span className="indicador-velocidad">
                                        <span className="punto-pulsante"></span>
                                        84 km/h
                                    </span>

                                    <span className="hora-registro">{time}</span>
                                </div>
                            </div>
                        </div>

                        {/* Tab */}
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

                                <div className="tarjeta-vehiculo">
                                    <div className="encabezado-tarjeta">
                                        <span className="nombre-vehiculo">HILUX-2024</span>

                                        <span className="etiqueta-estado etiqueta-en-mapa">
                                            EN MAPA
                                        </span>
                                    </div>

                                    <div className="grilla-datos">
                                        <div className="dato-item">
                                            <span className="dato-etiqueta">Motor</span>
                                            <span className="dato-valor-activo">Encendido</span>
                                        </div>

                                        <div className="dato-item">
                                            <span className="dato-etiqueta">Energía</span>
                                            <span className="dato-valor-normal">Conectado</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="tarjeta-vehiculo inactiva">
                                    <div className="encabezado-tarjeta">
                                        <span className="nombre-vehiculo atenuado">
                                            SPRINTER-A2
                                        </span>

                                        <span className="etiqueta-estado etiqueta-detenido">
                                            DETENIDO
                                        </span>
                                    </div>

                                    <div className="grilla-datos">
                                        <div className="dato-item">
                                            <span className="dato-etiqueta">Motor</span>
                                            <span className="dato-valor-error">Apagado</span>
                                        </div>

                                        <div className="dato-item">
                                            <span className="dato-etiqueta">Energía</span>
                                            <span className="dato-valor-apagado">Corte</span>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="pie-barra-lateral">
                        <div className="tab-pie">
                            <span className="material-symbols-outlined icono-pie">
                                settings
                            </span>

                            <span className="texto-pie">Configuración</span>
                        </div>

                        <div className="tab-pie">
                            <span className="material-symbols-outlined icono-pie">
                                help
                            </span>

                            <span className="texto-pie">Soporte</span>
                        </div>
                    </div>

                </aside>

                {/* Main */}
                <main className="area-principal">
                    <div className="fondo-mapa">

                        <img
                            className="imagen-mapa"
                            alt="Interfaz de mapa GPS"
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBR7c1-qPVow98usXpwxz-ywAbKob_I49E4vCNG67y_N3AYGSpRGzFNdMUdt5RoBIfXntqwOtYXYg7NIJrN4z3qSovIcSEltU1alS2LPM-uMfrw1CRMrOF-ic_hkCjUti7axYxA6aJ-63ufmin4wnu54Df2EEsxafxlU-MRI7lpw_LZOcKm5kmzj5jYVyJbHfTTjnT9U5dxqfKFUko5ZcQVTOYHvt2mDNrmzgl79AWXqlGhDMYnO7rZHKpqEc9Gof0kDeWK_gLDkaQ"
                        />

                        <div className="superposicion-degradado"></div>

                        {/* HUD */}
                        <div className="panel-hud">

                            <div className="tarjeta-telemetria">
                                <div className="encabezado-telemetria">
                                    <span className="titulo-telemetria">
                                        Salud Global
                                    </span>

                                    <span className="subtitulo-telemetria">
                                        Tiempo real
                                    </span>
                                </div>

                                <div className="metricas-telemetria">

                                    <div className="fila-metrica">
                                        <div className="encabezado-metrica">
                                            <span className="nombre-metrica">
                                                Estabilidad de señal
                                            </span>

                                            <span className="valor-metrica">98%</span>
                                        </div>

                                        <div className="barra-progreso">
                                            <div
                                                className="relleno-progreso"
                                                style={{ width: "98%" }}
                                            ></div>
                                        </div>
                                    </div>

                                    <div className="fila-velocidad-hud">

                                        <div className="bloque-velocidad">
                                            <p className="etiqueta-velocidad">
                                                Vel. promedio
                                            </p>

                                            <p className="valor-velocidad">
                                                62.4
                                                <span className="unidad-velocidad">
                                                    km/h
                                                </span>
                                            </p>
                                        </div>

                                        <div className="contenedor-sparkline">
                                            <div className="barras-sparkline">

                                                {sparkHeights.map((h, i) => (
                                                    <div
                                                        key={i}
                                                        className="barra-spark"
                                                        style={{ height: h }}
                                                    ></div>
                                                ))}

                                            </div>
                                        </div>

                                    </div>

                                </div>
                            </div>

                            {/* Coordenadas */}
                            <div className="panel-coordenadas">
                                <div className="fila-coordenadas">
                                    <span>LAT: 19.4326° N</span>
                                    <span>LNG: 99.1332° W</span>
                                </div>

                                <div className="fila-coordenadas">
                                    <span>ALT: 2,240m</span>
                                    <span>SAT: 14 ACTIVOS</span>
                                </div>
                            </div>

                        </div>

                        {/* Marcador */}
                        <div className="marcador-mapa">
                            <div className="contenedor-marcador">

                                <div className="efecto-ripple"></div>

                                <div className="icono-marcador">
                                    <span className="material-symbols-outlined">
                                        local_shipping
                                    </span>
                                </div>

                                <div className="tooltip-vehiculo">
                                    <p className="nombre-tooltip">
                                        Ford F-150 (#8821)
                                    </p>

                                    <p className="estado-tooltip">
                                        Motor: Encendido
                                    </p>

                                    <div className="fila-tooltip">
                                        <span>Velocidad: 84 km/h</span>
                                        <span>Actualizado: 2s</span>
                                    </div>

                                    <div className="flecha-tooltip"></div>
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