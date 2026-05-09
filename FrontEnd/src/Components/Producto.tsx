import "../Styles/Productos.css";

function Producto() {
    return (
        <section className="seccion-producto" id="producto">

            <div className="contenedor-producto">

                <div className="envoltorio-imagen-producto">

                    <div className="caja-imagen-producto">

                        <img
                            src="../Image/GPS.png"
                            alt="Hardware"
                        />

                    </div>

                    <div className="metrica-flotante">
                        <h3>0.5m</h3>
                        <span>Margen de Error</span>
                    </div>

                </div>

                <div className="contenido-producto">

                    <span className="etiqueta-seccion">
                        Producto
                    </span>

                    <h2 className="titulo-producto">
                        LA UNIDAD <br />
                        DE CONTROL
                        <span> CORE-X.</span>
                    </h2>

                    <p className="descripcion-producto">
                        Diseñado para flotas profesionales y activos
                        de alto valor. El Core-X integra conectividad
                        global multibanda con sensores inerciales avanzados.
                    </p>

                    <ul className="caracteristicas-producto">

                        <li>
                            <span className="punto"></span>
                            Batería de larga duración (365 días)
                        </li>

                        <li>
                            <span className="punto"></span>
                            Resistencia IP68 contra agua y polvo
                        </li>

                        <li>
                            <span className="punto"></span>
                            Instalación "Plug-and-Monitor" en 5 minutos
                        </li>

                    </ul>

                    <button className="boton-especificaciones">
                        Explorar Especificaciones Técnicas
                        <span>→</span>
                    </button>

                </div>

            </div>

        </section>
    )
}

export default Producto