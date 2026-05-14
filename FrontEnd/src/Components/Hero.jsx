import "../Styles/Hero.css";

function Hero() {
    return (
        <section className="hero">

            <div className="superposicion-hero"></div>

            <div className="contenedor-hero">

                <div className="contenido-hero">

                    <div className="insignia-hero">
                        <span className="pulso"></span>
                        Precision Redefined
                    </div>

                    <h1 className="titulo-hero">
                        EL CAMINO <br />
                        <span>DE LA PRECISION.</span>
                    </h1>

                    <p className="descripcion-hero">
                        High-end instrumentation for global navigation.
                        Track every coordinate with surgical accuracy
                        using our industrial-grade GPS ecosystem.
                    </p>

                    <div className="botones-hero">

                        <button className="boton-primario">
                            Empieza Ahora
                        </button>

                        <button className="boton-secundario">
                            Ver Demo
                        </button>

                    </div>

                </div>

                <div className="envoltorio-tarjeta-hero">

                    <div className="resplandor-hero"></div>

                    <div className="tarjeta-hero">

                        <div className="parte-superior-tarjeta">
                            <span>Live Telemetry</span>
                            <span className="id-tarjeta">ID: ROMP_4492_X</span>
                        </div>

                        <div className="mapa-tarjeta">
                            <div className="superposicion-mapa"></div>
                            <div className="punto-mapa"></div>
                        </div>

                        <div className="estadisticas-tarjeta">

                            <div className="caja-estadistica">
                                <small>Velocity</small>
                                <h3>84.2 <span>km/h</span></h3>
                            </div>

                            <div className="caja-estadistica">
                                <small>Signal</small>
                                <h3>99.8 <span>%</span></h3>
                            </div>

                        </div>

                    </div>

                    <div className="coordenadas">
                        Lat: 52.5200° N <br />
                        Long: 13.4050° E <br />
                        Alt: 34.2m
                    </div>

                </div>

            </div>

        </section>
    )
}

export default Hero