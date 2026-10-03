import { useState } from "react";
import "../Styles/Pricing.css";

const DESCUENTO_ANUAL = 0.8;   // 20% de ahorro al prepagar el año
const MESES_ANIO = 12;

/* Única fuente de verdad de los precios. Tanto el importe que se
muestra como el que va al checkout se derivan de `precioMensual`,
   así que no pueden quedar desalineados. */
const PLANES = [
    {
        id: "personal",
        nombre: "Personal (Moto / Auto)",
        precioMensual: 24900,
        unidad: "/mes",
        descripcion: "Para usuarios particulares que buscan seguridad diaria.",
        destacado: false,
        caracteristicas: [
            { texto: "1 Dispositivo GPS GT06", incluida: true },
            { texto: "Ubicación en tiempo real (actualización 15s)", incluida: true },
            { texto: "Historial de recorridos (7 días)", incluida: true },
            { texto: "Apagado de motor desde la app", incluida: true },
            { texto: "Alertas por SMS directos", incluida: false },
        ],
    },
    {
        id: "pro",
        nombre: "Flotas & Negocios Pro",
        precioMensual: 44900,
        unidad: "/mes por vehículo",
        descripcion: "Para flotas pequeñas y medianas con monitoreo intensivo.",
        destacado: true,
        caracteristicas: [
            { texto: "Posicionamiento ultrarrápido (5 segundos)", incluida: true },
            { texto: "Historial extendido (90 días)", incluida: true },
            { texto: "Recomendador de rutas rápidas (Google Maps)", incluida: true },
            { texto: "Alertas push y SMS ilimitadas (OTP + corte)", incluida: true },
            { texto: "Reportes de velocidad y paradas en PDF", incluida: true },
        ],
    },
    {
        id: "enterprise",
        nombre: "Empresarial Custom",
        precioMensual: 79900,
        unidad: "/mes",
        descripcion: "Soluciones corporativas con API REST dedicada.",
        destacado: false,
        caracteristicas: [
            { texto: "Dispositivos ilimitados", incluida: true },
            { texto: "Acceso API REST para integraciones ERP", incluida: true },
            { texto: "Soporte técnico prioritario 24/7", incluida: true },
            { texto: "Geocercas y subcuentas ilimitadas", incluida: true },
        ],
    },
];

const LLAVE_PRUEBAS = "pub_test_Q5y15286524589254823";
const wompiPublicKey = import.meta.env.VITE_WOMPI_PUB_KEY || LLAVE_PRUEBAS;

if (!import.meta.env.VITE_WOMPI_PUB_KEY) {
    // Antes caía en la llave de pruebas sin avisar: en producción eso
    // significa procesar pagos contra el entorno de test en silencio.
    console.warn(
        "[Pricing] Falta VITE_WOMPI_PUB_KEY. Se usará la llave de PRUEBAS de Wompi."
    );
}

const formatoCOP = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
});

/** Lo que se muestra en la tarjeta: importe por mes. */
const precioPorMes = (plan, anual) =>
    anual ? Math.round(plan.precioMensual * DESCUENTO_ANUAL) : plan.precioMensual;

/** Lo que realmente se cobra: el año completo si la facturación es anual. */
const precioACobrar = (plan, anual) =>
    anual
        ? Math.round(plan.precioMensual * MESES_ANIO * DESCUENTO_ANUAL)
        : plan.precioMensual;

function Pricing() {
    const [facturacionAnual, setFacturacionAnual] = useState(false);
    const [estadoPago, setEstadoPago] = useState(null);

    const lanzarCheckout = (plan, referencia, montoCentavos) => {
        if (!window.WidgetCheckout) return;

        const checkout = new window.WidgetCheckout({
            currency: "COP",
            amountInCents: montoCentavos,
            reference: referencia,
            publicKey: wompiPublicKey,
            // Ojo: /panel-control está detrás de RutaProtegida. Si no hay
            // sesión activa, el usuario acaba en /login. Ver nota al pie.
            redirectUrl: window.location.origin + "/panel-control",
        });

        checkout.open((result) => {
            const transaccion = result?.transaction;

            if (!transaccion) {
                setEstadoPago({
                    tipo: "pendiente",
                    mensaje: "No recibimos confirmación de la transacción. Revisa tu correo antes de volver a intentarlo.",
                });
                return;
            }

            if (transaccion.status === "APPROVED") {
                setEstadoPago({
                    tipo: "ok",
                    mensaje: `Pago aprobado para el plan ${plan.nombre}. Referencia: ${referencia}`,
                });
            } else if (transaccion.status === "DECLINED") {
                setEstadoPago({
                    tipo: "error",
                    mensaje: "El pago fue rechazado. Verifica los datos o prueba con otro medio.",
                });
            } else {
                setEstadoPago({
                    tipo: "pendiente",
                    mensaje: `Transacción en estado "${transaccion.status}". Te avisaremos cuando se confirme.`,
                });
            }
        });
    };

    const abrirWompiCheckout = (plan) => {
        const montoCentavos = precioACobrar(plan, facturacionAnual) * 100;
        // eslint-disable-next-line react-hooks/purity
        const referencia = `SUB-${Date.now()}-${plan.id.toUpperCase()}`;

        setEstadoPago(null);

        if (window.WidgetCheckout) {
            lanzarCheckout(plan, referencia, montoCentavos);
            return;
        }

        const script = document.createElement("script");
        script.src = "https://checkout.wompi.co/widget.js";
        script.async = true;
        script.onload = () => lanzarCheckout(plan, referencia, montoCentavos);
        script.onerror = () =>
            setEstadoPago({
                tipo: "error",
                mensaje: "No pudimos cargar la pasarela de pago. Revisa tu conexión e inténtalo de nuevo.",
            });
        document.body.appendChild(script);
    };

    return (
        <section className="seccion-precios" id="pricing">
            <div className="contenedor-precios">

                <div className="encabezado-precios">
                    <span className="etiqueta-seccion">Planes y Precios</span>
                    <h2>Protección inteligente para tu vehículo o flota</h2>
                    <p className="descripcion-precios">
                        Selecciona la cobertura que mejor se adapte a tus necesidades.
                        Cancela en cualquier momento sin cláusulas de permanencia.
                    </p>

                    <div className="conmutador-facturacion">
                        <span className={`conmutador-etiqueta ${!facturacionAnual ? "conmutador-etiqueta--activa" : ""}`}>
                            Mensual
                        </span>

                        <button
                            type="button"
                            role="switch"
                            aria-checked={facturacionAnual}
                            aria-label="Activar facturación anual con 20% de ahorro"
                            className="conmutador-pista"
                            onClick={() => setFacturacionAnual((v) => !v)}
                        >
                            <span className="conmutador-mando" />
                        </button>

                        <span className={`conmutador-etiqueta ${facturacionAnual ? "conmutador-etiqueta--activa" : ""}`}>
                            Anual
                            <span className="insignia-ahorro">Ahorra 20%</span>
                        </span>
                    </div>
                </div>

                <div className="cuadricula-precios">
                    {PLANES.map((plan) => {
                        const porMes = precioPorMes(plan, facturacionAnual);
                        const aCobrar = precioACobrar(plan, facturacionAnual);

                        return (
                            <div
                                key={plan.id}
                                className={`tarjeta-precio ${plan.destacado ? "destacado" : ""}`}
                            >
                                {plan.destacado && (
                                    <div className="insignia-destacado">Recomendado</div>
                                )}

                                <div className="parte-superior-plan">
                                    <span className={`etiqueta-plan ${plan.destacado ? "texto-destacado" : ""}`}>
                                        {plan.nombre}
                                    </span>

                                    <h3 className="precio-plan">
                                        {formatoCOP.format(porMes)}
                                        <span className="periodo-plan">{plan.unidad}</span>
                                    </h3>

                                    {/* El importe real, visible ANTES de abrir el checkout */}
                                    {facturacionAnual && (
                                        <span className="nota-facturacion">
                                            Se factura {formatoCOP.format(aCobrar)} hoy, por 12 meses
                                        </span>
                                    )}

                                    <p className="descripcion-plan">{plan.descripcion}</p>
                                </div>

                                <ul className="caracteristicas-plan">
                                    {plan.caracteristicas.map(({ texto, incluida }) => (
                                        <li key={texto} className={incluida ? "" : "excluida"}>
                                            <span className="marca" aria-hidden="true">
                                                {incluida ? "✓" : "✕"}
                                            </span>
                                            {texto}
                                        </li>
                                    ))}
                                </ul>

                                <button
                                    type="button"
                                    onClick={() => abrirWompiCheckout(plan)}
                                    className={`boton-precio ${plan.destacado ? "primario" : "secundario"}`}
                                >
                                    {facturacionAnual
                                        ? `Pagar 12 meses · ${formatoCOP.format(aCobrar)}`
                                        : `Pagar ${formatoCOP.format(aCobrar)} · PSE / Nequi / Tarjeta`}
                                </button>
                            </div>
                        );
                    })}
                </div>

                {estadoPago && (
                    <div
                        className={`estado-pago estado-pago--${estadoPago.tipo}`}
                        role="status"
                        aria-live="polite"
                    >
                        {estadoPago.mensaje}
                    </div>
                )}

            </div>
        </section>
    );
}

export default Pricing;