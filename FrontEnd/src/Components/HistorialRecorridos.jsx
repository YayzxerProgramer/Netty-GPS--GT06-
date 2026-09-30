import { useState, useEffect, useRef } from "react";
import { get } from "../Service/api";
import "../Styles/MapaGPS.css";

export default function HistorialRecorridos({ imei, mapa, google }) {
    const [fechaPreset, setFechaPreset] = useState("hoy");
    const [fechaInicio, setFechaInicio] = useState("");
    const [fechaFin, setFechaFin] = useState("");
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState(null);

    const [historial, setHistorial] = useState(null);
    const [reproduciendo, setReproduciendo] = useState(false);
    const [indiceActual, setIndiceActual] = useState(0);
    const [velocidadSimulacion, setVelocidadSimulacion] = useState(1);

    const polylineRef = useRef(null);
    const markerRef = useRef(null);
    const stopMarkersRef = useRef([]);
    const intervalRef = useRef(null);

    // Actualizar fechas según preset
    useEffect(() => {
        const ahora = new Date();
        let inicio = new Date();

        if (fechaPreset === "hoy") {
            inicio.setHours(0, 0, 0, 0);
        } else if (fechaPreset === "ayer") {
            inicio.setDate(inicio.getDate() - 1);
            inicio.setHours(0, 0, 0, 0);
            ahora.setDate(ahora.getDate() - 1);
            ahora.setHours(23, 59, 59, 999);
        } else if (fechaPreset === "7dias") {
            inicio.setDate(inicio.getDate() - 7);
        }

        setFechaInicio(inicio.toISOString().slice(0, 16));
        setFechaFin(ahora.toISOString().slice(0, 16));
    }, [fechaPreset]);

    const buscarHistorial = async () => {
        if (!imei) {
            setError("Selecciona un vehículo con IMEI válido");
            return;
        }
        setCargando(true);
        setError(null);
        limpiarMapa();

        try {
            const isoInicio = new Date(fechaInicio).toISOString();
            const isoFin = new Date(fechaFin).toISOString();

            const res = await get(`/gps/historial-analizado/${imei}?desde=${isoInicio}&hasta=${isoFin}`);
            setHistorial(res);
            setIndiceActual(0);

            if (res && res.puntos && res.puntos.length > 0 && mapa && google) {
                renderizarRuta(res.puntos, res.paradas);
            } else {
                setError("No hay registros de recorrido en el rango seleccionado.");
            }
        } catch (err) {
            setError(err.message || "Error al consultar el historial");
        } finally {
            setCargando(false);
        }
    };

    const limpiarMapa = () => {
        if (polylineRef.current) polylineRef.current.setMap(null);
        if (markerRef.current) markerRef.current.setMap(null);
        stopMarkersRef.current.forEach((m) => m.setMap(null));
        stopMarkersRef.current = [];
        if (intervalRef.current) clearInterval(intervalRef.current);
        setReproduciendo(false);
    };

    const renderizarRuta = (puntos, paradas) => {
        const path = puntos.map((p) => ({ lat: p.latitud, lng: p.longitud }));

        // Dibujar Polyline en el mapa
        polylineRef.current = new google.maps.Polyline({
            path: path,
            geodesic: true,
            strokeColor: "#3B82F6",
            strokeOpacity: 0.8,
            strokeWeight: 5,
            map: mapa,
        });

        // Marcadores de paradas
        if (paradas && paradas.length > 0) {
            paradas.forEach((parada, idx) => {
                const stopMarker = new google.maps.Marker({
                    position: { lat: parada.latitud, lng: parada.longitud },
                    map: mapa,
                    title: `Parada ${idx + 1}: ${parada.duracionMinutos} min`,
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 7,
                        fillColor: "#EF4444",
                        fillOpacity: 1,
                        strokeColor: "#FFFFFF",
                        strokeWeight: 2,
                    },
                });
                stopMarkersRef.current.push(stopMarker);
            });
        }

        // Marcador del vehículo en el primer punto
        markerRef.current = new google.maps.Marker({
            position: path[0],
            map: mapa,
            title: "Vehículo",
            icon: {
                url: "/icons/motorcycle.svg",
                scaledSize: new google.maps.Size(40, 40),
            },
        });

        // Ajustar zoom del mapa a la ruta
        const bounds = new google.maps.LatLngBounds();
        path.forEach((pt) => bounds.extend(pt));
        mapa.fitBounds(bounds);
    };

    // Reproductor de trazado
    useEffect(() => {
        if (reproduciendo && historial && historial.puntos.length > 0) {
            const delay = 500 / velocidadSimulacion;
            intervalRef.current = setInterval(() => {
                setIndiceActual((prev) => {
                    if (prev >= historial.puntos.length - 1) {
                        setReproduciendo(false);
                        return prev;
                    }
                    const siguiente = prev + 1;
                    const punto = historial.puntos[siguiente];

                    if (markerRef.current && mapa) {
                        const newPos = { lat: punto.latitud, lng: punto.longitud };
                        markerRef.current.setPosition(newPos);
                    }
                    return siguiente;
                });
            }, delay);
        } else {
            if (intervalRef.current) clearInterval(intervalRef.current);
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [reproduciendo, velocidadSimulacion, historial]);

    const handleSliderChange = (e) => {
        const val = parseInt(e.target.value, 10);
        setIndiceActual(val);
        if (historial && historial.puntos[val] && markerRef.current) {
            const pt = historial.puntos[val];
            markerRef.current.setPosition({ lat: pt.latitud, lng: pt.longitud });
        }
    };

    const puntoActual = historial?.puntos?.[indiceActual];

    return (
        <div style={{ background: "white", padding: "16px", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", marginBottom: "16px" }}>
            <h3 style={{ margin: "0 0 12px 0", color: "#1F2937", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>📜</span> Historial de Recorridos
            </h3>

            {/* Filtros de Fecha */}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
                <button
                    onClick={() => setFechaPreset("hoy")}
                    style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #D1D5DB", background: fechaPreset === "hoy" ? "#2563EB" : "#F3F4F6", color: fechaPreset === "hoy" ? "white" : "#374151", cursor: "pointer" }}
                >
                    Hoy
                </button>
                <button
                    onClick={() => setFechaPreset("ayer")}
                    style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #D1D5DB", background: fechaPreset === "ayer" ? "#2563EB" : "#F3F4F6", color: fechaPreset === "ayer" ? "white" : "#374151", cursor: "pointer" }}
                >
                    Ayer
                </button>
                <button
                    onClick={() => setFechaPreset("7dias")}
                    style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #D1D5DB", background: fechaPreset === "7dias" ? "#2563EB" : "#F3F4F6", color: fechaPreset === "7dias" ? "white" : "#374151", cursor: "pointer" }}
                >
                    Últimos 7 días
                </button>
            </div>

            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center", marginBottom: "16px" }}>
                <input
                    type="datetime-local"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #D1D5DB" }}
                />
                <span>a</span>
                <input
                    type="datetime-local"
                    value={fechaFin}
                    onChange={(e) => setFechaFin(e.target.value)}
                    style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #D1D5DB" }}
                />
                <button
                    onClick={buscarHistorial}
                    disabled={cargando}
                    style={{ padding: "8px 16px", borderRadius: "6px", background: "#2563EB", color: "white", border: "none", fontWeight: "bold", cursor: "pointer" }}
                >
                    {cargando ? "Consultando..." : "Consultar Ruta"}
                </button>
            </div>

            {error && <p style={{ color: "#EF4444", fontSize: "14px", marginTop: "4px" }}>{error}</p>}

            {/* Estadísticas del Recorrido */}
            {historial && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "8px", background: "#F8FAFC", padding: "12px", borderRadius: "8px", marginBottom: "16px" }}>
                    <div>
                        <span style={{ fontSize: "12px", color: "#64748B" }}>Distancia Total</span>
                        <p style={{ margin: 0, fontWeight: "bold", fontSize: "16px", color: "#0F172A" }}>{historial.distanciaTotalKm} km</p>
                    </div>
                    <div>
                        <span style={{ fontSize: "12px", color: "#64748B" }}>Vel. Máxima</span>
                        <p style={{ margin: 0, fontWeight: "bold", fontSize: "16px", color: "#0F172A" }}>{historial.velocidadMaximaKmh} km/h</p>
                    </div>
                    <div>
                        <span style={{ fontSize: "12px", color: "#64748B" }}>Vel. Promedio</span>
                        <p style={{ margin: 0, fontWeight: "bold", fontSize: "16px", color: "#0F172A" }}>{historial.velocidadPromedioKmh} km/h</p>
                    </div>
                    <div>
                        <span style={{ fontSize: "12px", color: "#64748B" }}>Paradas</span>
                        <p style={{ margin: 0, fontWeight: "bold", fontSize: "16px", color: "#EF4444" }}>{historial.cantidadParadas}</p>
                    </div>
                </div>
            )}

            {/* Reproductor Animado */}
            {historial && historial.puntos && historial.puntos.length > 0 && (
                <div style={{ background: "#1E293B", color: "white", padding: "16px", borderRadius: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                        <div style={{ display: "flex", gap: "8px" }}>
                            <button
                                onClick={() => setReproduciendo(!reproduciendo)}
                                style={{ padding: "8px 16px", borderRadius: "6px", background: reproduciendo ? "#EF4444" : "#10B981", color: "white", border: "none", fontWeight: "bold", cursor: "pointer" }}
                            >
                                {reproduciendo ? "⏸ Pausar" : "▶ Reproducir"}
                            </button>
                            <button
                                onClick={() => { setIndiceActual(0); setReproduciendo(false); }}
                                style={{ padding: "8px 12px", borderRadius: "6px", background: "#475569", color: "white", border: "none", cursor: "pointer" }}
                            >
                                🔄 Reiniciar
                            </button>
                        </div>
                        <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                            <span style={{ fontSize: "12px" }}>Velocidad:</span>
                            {[1, 2, 5, 10].map((v) => (
                                <button
                                    key={v}
                                    onClick={() => setVelocidadSimulacion(v)}
                                    style={{ padding: "4px 8px", borderRadius: "4px", border: "none", background: velocidadSimulacion === v ? "#3B82F6" : "#334155", color: "white", cursor: "pointer" }}
                                >
                                    {v}x
                                </button>
                            ))}
                        </div>
                    </div>

                    <input
                        type="range"
                        min="0"
                        max={historial.puntos.length - 1}
                        value={indiceActual}
                        onChange={handleSliderChange}
                        style={{ width: "100%", cursor: "pointer" }}
                    />

                    {puntoActual && (
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", fontSize: "13px", color: "#94A3B8" }}>
                            <span>Hora: {new Date(puntoActual.registradoEn).toLocaleTimeString()}</span>
                            <span>Velocidad: {puntoActual.velocidad} km/h</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
