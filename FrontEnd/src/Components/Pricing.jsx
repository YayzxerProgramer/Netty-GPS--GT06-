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
                                $29
                                <span>/mes</span>
                            </h3>

                        </div>

                        <ul className="caracteristicas-plan">

                            <li><span>✓</span>1 Dispositivo Core-X</li>
                            <li><span>✓</span>App Móvil Dashboard</li>
                            <li><span>✓</span>Alertas de Geocerca (3)</li>

                        </ul>

                        <button className="boton-precio secundario">
                            Seleccionar Plan
                        </button>

                    </div>

                    <div className="tarjeta-precio destacado">

                        <div className="insignia-destacado">
                            Recomendado
                        </div>

                        <div className="parte-superior-plan">

                            <span className="etiqueta-plan texto-destacado">
                                Fleet Enterprise
                            </span>

                            <h3>
                                $149
                                <span>/mes</span>
                            </h3>

                        </div>

                        <ul className="caracteristicas-plan">

                            <li><span>✓</span>Hasta 10 Dispositivos</li>
                            <li><span>✓</span>API Access & Webhooks</li>
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