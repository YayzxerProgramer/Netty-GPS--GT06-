import { useState } from "react";
import "../Styles/Pricing.css";

function Pricing() {
    const [facturacionAnual, setFacturacionAnual] = useState(false);

    const wompiPublicKey = import.meta.env.VITE_WOMPI_PUB_KEY || "pub_test_Q5y15286524589254823";

    const abriWompiCheckout = (planNombre, precioMes) => {
        const precioTotalCOP = (facturacionAnual ? precioMes * 12 * 0.8 : precioMes) * 100; // En centavos
        const referenciaUnica = `SUB-${Date.now()}-${planNombre.toUpperCase()}`;

        // Cargar script dinámico de Wompi Widget si no existe
        if (!window.WidgetCheckout) {
            const script = document.createElement("script");
            script.src = "https://checkout.wompi.co/widget.js";
            script.async = true;
            script.onload = () => lanzarCheckout(referenciaUnica, precioTotalCOP, planNombre);
            document.body.appendChild(script);
        } else {
            lanzarCheckout(referenciaUnica, precioTotalCOP, planNombre);
        }
    };

    const lanzarCheckout = (referencia, montoCentavos, plan) => {
        if (window.WidgetCheckout) {
            const checkout = new window.WidgetCheckout({
                currency: "COP",
                amountInCents: montoCentavos,
                reference: referencia,
                publicKey: wompiPublicKey,
                redirectUrl: window.location.origin + "/panel-control",
            });

            checkout.open((result) => {
                const transaction = result.transaction;
                console.log("Resultado transacción Wompi:", transaction);
            });
        }
    };

    return (
        <section className="seccion-precios" id="pricing">
            <div className="contenedor-precios">
                <div className="encabezado-precios">
                    <span className="etiqueta-seccion">Planes y Precios Específicos</span>
                    <h2>Protección Inteligente para tu Vehículo o Flota</h2>
                    <p style={{ color: "#64748B", maxWidth: "600px", margin: "12px auto 0" }}>
                        Selecciona la cobertura que mejor se adapte a tus necesidades. Cancela en cualquier momento sin cláusulas de permanencia.
                    </p>

                    {/* Toggle Facturación Mensual / Anual */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", marginTop: "24px" }}>
                        <span style={{ fontWeight: !facturacionAnual ? "bold" : "normal", color: "#1E293B" }}>Mensual</span>
                        <div
                            onClick={() => setFacturacionAnual(!facturacionAnual)}
                            style={{
                                width: "52px",
                                height: "28px",
                                background: facturacionAnual ? "#2563EB" : "#CBD5E1",
                                borderRadius: "14px",
                                padding: "2px",
                                cursor: "pointer",
                                transition: "background 0.3s",
                            }}
                        >
                            <div
                                style={{
                                    width: "24px",
                                    height: "24px",
                                    background: "white",
                                    borderRadius: "50%",
                                    transform: facturacionAnual ? "translateX(24px)" : "translateX(0)",
                                    transition: "transform 0.3s",
                                }}
                            />
                        </div>
                        <span style={{ fontWeight: facturacionAnual ? "bold" : "normal", color: "#1E293B" }}>
                            Anual <span style={{ background: "#DCFCE7", color: "#166534", padding: "2px 8px", borderRadius: "12px", fontSize: "12px", marginLeft: "4px" }}>Ahorra 20%</span>
                        </span>
                    </div>
                </div>

                <div className="cuadricula-precios" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px", marginTop: "40px" }}>
                    
                    {/* Plan 1: Personal */}
                    <div className="tarjeta-precio" style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: "16px", padding: "32px", display: "flex", flexDirection: "column" }}>
                        <div className="parte-superior-plan">
                            <span className="etiqueta-plan" style={{ background: "#F1F5F9", color: "#475569", padding: "4px 12px", borderRadius: "20px", fontSize: "13px", fontWeight: "bold" }}>
                                Personal (Moto / Auto)
                            </span>
                            <h3 style={{ fontSize: "32px", margin: "16px 0 8px", color: "#0F172A" }}>
                                ${facturacionAnual ? "19.900" : "24.900"}
                                <span style={{ fontSize: "14px", color: "#64748B" }}>/mes</span>
                            </h3>
                            <p style={{ fontSize: "13px", color: "#64748B" }}>Para usuarios particulares que buscan seguridad diaria.</p>
                        </div>

                        <ul className="caracteristicas-plan" style={{ listStyle: "none", padding: 0, margin: "24px 0", flex: 1 }}>
                            <li style={{ padding: "8px 0", fontSize: "14px", color: "#334155" }}>✓ 1 Dispositivo GPS GT06</li>
                            <li style={{ padding: "8px 0", fontSize: "14px", color: "#334155" }}>✓ Ubicación en Tiempo Real (Actualización 15s)</li>
                            <li style={{ padding: "8px 0", fontSize: "14px", color: "#334155" }}>✓ Historial de Recorridos (7 Días)</li>
                            <li style={{ padding: "8px 0", fontSize: "14px", color: "#334155" }}>✓ Apagado de Motor desde App</li>
                            <li style={{ padding: "8px 0", fontSize: "14px", color: "#94A3B8" }}>✕ Alertas por SMS directos</li>
                        </ul>

                        <button
                            onClick={() => abriWompiCheckout("personal", 24900)}
                            className="boton-precio secundario"
                            style={{ width: "100%", padding: "12px", borderRadius: "8px", background: "#F1F5F9", color: "#0F172A", border: "none", fontWeight: "bold", cursor: "pointer" }}
                        >
                            Pagar con Wompi (PSE / Nequi / Tarjeta)
                        </button>
                    </div>

                    {/* Plan 2: Flota Pro (Destacado) */}
                    <div className="tarjeta-precio destacado" style={{ background: "#0F172A", color: "white", border: "2px solid #3B82F6", borderRadius: "16px", padding: "32px", display: "flex", flexDirection: "column", position: "relative" }}>
                        <div className="insignia-destacado" style={{ position: "absolute", top: "-12px", right: "24px", background: "#2563EB", color: "white", padding: "4px 12px", borderRadius: "12px", fontSize: "12px", fontWeight: "bold" }}>
                            Recomendado
                        </div>

                        <div className="parte-superior-plan">
                            <span className="etiqueta-plan texto-destacado" style={{ background: "#1E293B", color: "#60A5FA", padding: "4px 12px", borderRadius: "20px", fontSize: "13px", fontWeight: "bold" }}>
                                Flotas & Negocios Pro
                            </span>
                            <h3 style={{ fontSize: "32px", margin: "16px 0 8px", color: "white" }}>
                                ${facturacionAnual ? "35.900" : "44.900"}
                                <span style={{ fontSize: "14px", color: "#94A3B8" }}>/mes por vehículo</span>
                            </h3>
                            <p style={{ fontSize: "13px", color: "#94A3B8" }}>Para flotas pequeñas y medianas con monitoreo intensivo.</p>
                        </div>

                        <ul className="caracteristicas-plan" style={{ listStyle: "none", padding: 0, margin: "24px 0", flex: 1 }}>
                            <li style={{ padding: "8px 0", fontSize: "14px", color: "#E2E8F0" }}>✓ Posicionamiento Ultrarrápido (5 segundos)</li>
                            <li style={{ padding: "8px 0", fontSize: "14px", color: "#E2E8F0" }}>✓ Historial Extendido (90 Días)</li>
                            <li style={{ padding: "8px 0", fontSize: "14px", color: "#E2E8F0" }}>✓ Recomendador de Rutas Rápida (Google Maps)</li>
                            <li style={{ padding: "8px 0", fontSize: "14px", color: "#E2E8F0" }}>✓ Alertas Push & SMS Ilimitadas (OTP + Corte)</li>
                            <li style={{ padding: "8px 0", fontSize: "14px", color: "#E2E8F0" }}>✓ Reportes de Velocidad y Paradas en PDF</li>
                        </ul>

                        <button
                            onClick={() => abriWompiCheckout("pro", 44900)}
                            className="boton-precio primario"
                            style={{ width: "100%", padding: "12px", borderRadius: "8px", background: "#2563EB", color: "white", border: "none", fontWeight: "bold", cursor: "pointer" }}
                        >
                            Pagar con Wompi (PSE / Nequi / Tarjeta)
                        </button>
                    </div>

                    {/* Plan 3: Enterprise */}
                    <div className="tarjeta-precio" style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: "16px", padding: "32px", display: "flex", flexDirection: "column" }}>
                        <div className="parte-superior-plan">
                            <span className="etiqueta-plan" style={{ background: "#F1F5F9", color: "#475569", padding: "4px 12px", borderRadius: "20px", fontSize: "13px", fontWeight: "bold" }}>
                                Empresarial Custom
                            </span>
                            <h3 style={{ fontSize: "32px", margin: "16px 0 8px", color: "#0F172A" }}>
                                ${facturacionAnual ? "63.900" : "79.900"}
                                <span style={{ fontSize: "14px", color: "#64748B" }}>/mes</span>
                            </h3>
                            <p style={{ fontSize: "13px", color: "#64748B" }}>Soluciones corporativas con API REST dedicada.</p>
                        </div>

                        <ul className="caracteristicas-plan" style={{ listStyle: "none", padding: 0, margin: "24px 0", flex: 1 }}>
                            <li style={{ padding: "8px 0", fontSize: "14px", color: "#334155" }}>✓ Dispositivos Ilimitados</li>
                            <li style={{ padding: "8px 0", fontSize: "14px", color: "#334155" }}>✓ Acceso API REST para Integraciones ERP</li>
                            <li style={{ padding: "8px 0", fontSize: "14px", color: "#334155" }}>✓ Soporte Técnico Prioritario 24/7</li>
                            <li style={{ padding: "8px 0", fontSize: "14px", color: "#334155" }}>✓ Geocercas y Subcuentas Ilimitadas</li>
                        </ul>

                        <button
                            onClick={() => abriWompiCheckout("enterprise", 79900)}
                            className="boton-precio secundario"
                            style={{ width: "100%", padding: "12px", borderRadius: "8px", background: "#F1F5F9", color: "#0F172A", border: "none", fontWeight: "bold", cursor: "pointer" }}
                        >
                            Pagar con Wompi (PSE / Nequi / Tarjeta)
                        </button>
                    </div>

                </div>
            </div>
        </section>
    );
}

export default Pricing;