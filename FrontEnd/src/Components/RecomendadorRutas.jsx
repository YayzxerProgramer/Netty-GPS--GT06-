import { useState, useRef, useEffect } from "react";

export default function RecomendadorRutas({ mapa, google, posicionActualVehiculo }) {
    const [origen, setOrigen] = useState("");
    const [destino, setDestino] = useState("");
    const [usarPosicionVehiculo, setUsarPosicionVehiculo] = useState(true);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState(null);
    const [resumenRuta, setResumenRuta] = useState(null);

    const inputDestinoRef = useRef(null);
    const directionsRendererRef = useRef(null);
    const autocompleteRef = useRef(null);

    // Inicializar Google Autocomplete y DirectionsRenderer
    useEffect(() => {
        if (google && mapa && inputDestinoRef.current) {
            autocompleteRef.current = new google.maps.places.Autocomplete(inputDestinoRef.current, {
                componentRestrictions: { country: "co" }, // Restringido a Colombia
                fields: ["formatted_address", "geometry", "name"],
            });

            autocompleteRef.current.addListener("place_changed", () => {
                const place = autocompleteRef.current.getPlace();
                if (place && place.formatted_address) {
                    setDestino(place.formatted_address);
                }
            });

            directionsRendererRef.current = new google.maps.DirectionsRenderer({
                map: mapa,
                suppressMarkers: false,
                polylineOptions: {
                    strokeColor: "#10B981", // Verde para ruta óptima
                    strokeOpacity: 0.9,
                    strokeWeight: 6,
                },
            });
        }
    }, [google, mapa]);

    const calcularRutaRapida = () => {
        if (!google || !mapa) return;
        setCargando(true);
        setError(null);
        setResumenRuta(null);

        let origenPoint;
        if (usarPosicionVehiculo && posicionActualVehiculo) {
            origenPoint = new google.maps.LatLng(posicionActualVehiculo.latitud, posicionActualVehiculo.longitud);
        } else if (origen.trim() !== "") {
            origenPoint = origen;
        } else {
            setError("Por favor ingresa un punto de origen o usa la ubicación del vehículo.");
            setCargando(false);
            return;
        }

        if (!destino || destino.trim() === "") {
            setError("Por favor ingresa un destino.");
            setCargando(false);
            return;
        }

        const directionsService = new google.maps.DirectionsService();

        directionsService.route(
            {
                origin: origenPoint,
                destination: destino,
                travelMode: google.maps.TravelMode.DRIVING,
                drivingOptions: {
                    departureTime: new Date(Date.now()), // Tráfico en tiempo real
                    trafficModel: "bestguess",
                },
                provideRouteAlternatives: true,
            },
            (result, status) => {
                setCargando(false);
                if (status === google.maps.DirectionsStatus.OK) {
                    directionsRendererRef.current.setDirections(result);

                    const route = result.routes[0];
                    const leg = route.legs[0];

                    setResumenRuta({
                        distancia: leg.distance.text,
                        duracion: leg.duration.text,
                        duracionEnTrafico: leg.duration_in_traffic ? leg.duration_in_traffic.text : leg.duration.text,
                        direccionOrigen: leg.start_address,
                        direccionDestino: leg.end_address,
                        pasos: leg.steps.map((s) => s.instructions.replace(/<[^>]*>?/gm, "")), // Limpiar tags HTML
                    });
                } else {
                    setError("No se pudo calcular la ruta. Verifica las direcciones ingresadas.");
                }
            }
        );
    };

    const limpiarRuta = () => {
        if (directionsRendererRef.current) {
            directionsRendererRef.current.setDirections({ routes: [] });
        }
        setResumenRuta(null);
        setDestino("");
        setOrigen("");
    };

    return (
        <div style={{ background: "white", padding: "16px", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", marginBottom: "16px" }}>
            <h3 style={{ margin: "0 0 12px 0", color: "#1F2937", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>🚀</span> Recomendación de Ruta Más Rápida
            </h3>

            {/* Selector de Origen */}
            <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "14px", color: "#374151" }}>
                    <input
                        type="checkbox"
                        checked={usarPosicionVehiculo}
                        onChange={(e) => setUsarPosicionVehiculo(e.target.checked)}
                    />
                    Usar la ubicación actual del vehículo como Origen
                </label>

                {!usarPosicionVehiculo && (
                    <input
                        type="text"
                        placeholder="Ingresa la dirección de Origen"
                        value={origen}
                        onChange={(e) => setOrigen(e.target.value)}
                        style={{ width: "100%", padding: "8px 12px", marginTop: "6px", borderRadius: "6px", border: "1px solid #D1D5DB" }}
                    />
                )}
            </div>

            {/* Selector de Destino con Google Autocomplete */}
            <div style={{ marginBottom: "16px" }}>
                <label style={{ fontSize: "14px", fontWeight: "bold", color: "#374151" }}>¿A dónde quieres ir?</label>
                <input
                    ref={inputDestinoRef}
                    type="text"
                    placeholder="Escribe la dirección o lugar de destino..."
                    value={destino}
                    onChange={(e) => setDestino(e.target.value)}
                    style={{ width: "100%", padding: "10px 14px", marginTop: "6px", borderRadius: "6px", border: "1px solid #D1D5DB", fontSize: "15px" }}
                />
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
                <button
                    onClick={calcularRutaRapida}
                    disabled={cargando}
                    style={{ padding: "10px 20px", borderRadius: "6px", background: "#10B981", color: "white", border: "none", fontWeight: "bold", cursor: "pointer", flex: 1 }}
                >
                    {cargando ? "Calculando Ruta Rápida..." : "⚡ Ver Ruta Más Rápida"}
                </button>

                {resumenRuta && (
                    <button
                        onClick={limpiarRuta}
                        style={{ padding: "10px 16px", borderRadius: "6px", background: "#EF4444", color: "white", border: "none", cursor: "pointer" }}
                    >
                        Limpiar
                    </button>
                )}
            </div>

            {error && <p style={{ color: "#EF4444", fontSize: "14px", marginTop: "8px" }}>{error}</p>}

            {/* Resumen de la Ruta Calculada */}
            {resumenRuta && (
                <div style={{ marginTop: "16px", background: "#ECFDF5", border: "1px solid #A7F3D0", padding: "14px", borderRadius: "8px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <span style={{ fontSize: "14px", color: "#065F46" }}>Tiempo Estimado (Con Tráfico):</span>
                        <strong style={{ fontSize: "18px", color: "#047857" }}>{resumenRuta.duracionEnTrafico}</strong>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <span style={{ fontSize: "14px", color: "#065F46" }}>Distancia Total:</span>
                        <strong style={{ fontSize: "16px", color: "#065F46" }}>{resumenRuta.distancia}</strong>
                    </div>

                    <div style={{ fontSize: "12px", color: "#047857", marginTop: "8px", borderTop: "1px solid #A7F3D0", paddingTop: "8px" }}>
                        <p style={{ margin: "2px 0" }}>📍 <strong>Desde:</strong> {resumenRuta.direccionOrigen}</p>
                        <p style={{ margin: "2px 0" }}>🏁 <strong>Hasta:</strong> {resumenRuta.direccionDestino}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
