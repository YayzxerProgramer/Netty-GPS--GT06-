import "../Styles/Pricing.css";

function Pricing() {
    return (
        <section className="seccion-precios" id="pricing">

            <div className="contenedor-precios">

                <div className="encabezado-precios">

                    <span className="etiqueta-seccion">
                        Planes y Precios
                    </span>

                    <h2>
                        Escalabilidad sin fricciones.
                    </h2>

                </div>

                <div className="cuadricula-precios">

                    <div className="tarjeta-precio">

                        <div className="parte-superior-plan">

                            <span className="etiqueta-plan">
                                Individual
                            </span>

                            <h3>
                                $119.999
                                <span>/mes</span>
                            </h3>

                        </div>

                        <ul className="caracteristicas-plan">

                            <li><span>✓</span>1 Dispositivo GNXIS</li>
                            <li><span>✓</span>App Web</li>
                            <li><span>✓</span>Alertas de Geocerca</li>

                        </ul>

                        <button className="boton-precio secundario">
                            Hablar con Ventas
                        </button>

                    </div>

                    <div className="tarjeta-precio destacado">

                        <div className="insignia-destacado">
                            Recomendado
                        </div>

                        <div className="parte-superior-plan">

                            <span className="etiqueta-plan texto-destacado">
                                Empresarial
                            </span>

                            <h3>
                                $499.999
                                <span>/mes</span>
                            </h3>

                        </div>

                        <ul className="caracteristicas-plan">

                            <li><span>✓</span>Hasta 5 Dispositivos GNXIS</li>
                            <li><span>✓</span>App Web</li>
                            <li><span>✓</span>Alertas de Geocerca</li>
                            <li><span>✓</span>Soporte Prioritario 24/7</li>
                            <li><span>✓</span>Reportes PDF Automatizados</li>

                        </ul>

                        <button className="boton-precio primario">
                            Hablar con Ventas
                        </button>

                    </div>

                </div>

            </div>

        </section>
    )
}

export default Pricing