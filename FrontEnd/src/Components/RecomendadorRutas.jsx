import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { distancia, formatearDistancia, decimal, horaMinutos, aLiteral, crearMarcadorHtml, htmlIconoCircular, encuadrar } from "./mapaUtils";

const CLAVE_RECIENTES = "romp:destinos-recientes";
const COLORES_TRAFICO = ["#b2cea8", "#e0b97a", "#c9826c"];
const NOMBRES_TRAFICO = ["Tráfico fluido", "Tráfico moderado", "Congestión"];
const LLEGADA_METROS = 40;

const ICONOS_MANIOBRA = {
    "turn-left": "turn_left",
    "turn-right": "turn_right",
    "turn-slight-left": "turn_slight_left",
    "turn-slight-right": "turn_slight_right",
    "turn-sharp-left": "turn_sharp_left",
    "turn-sharp-right": "turn_sharp_right",
    "uturn-left": "u_turn_left",
    "uturn-right": "u_turn_right",
    "roundabout-left": "roundabout_left",
    "roundabout-right": "roundabout_right",
    "keep-left": "fork_left",
    "fork-left": "fork_left",
    "ramp-left": "fork_left",
    "keep-right": "fork_right",
    "fork-right": "fork_right",
    "ramp-right": "fork_right",
    merge: "merge",
    ferry: "directions_boat",
};

function leerRecientes() {
    try {
        return JSON.parse(localStorage.getItem(CLAVE_RECIENTES)) || [];
    } catch {
        return [];
    }
}

function guardarReciente(lugar, actuales) {
    const lista = [lugar, ...actuales.filter((x) => x.placeId !== lugar.placeId)].slice(0, 5);
    try {
        localStorage.setItem(CLAVE_RECIENTES, JSON.stringify(lista));
    } catch {
        // Sin almacenamiento disponible: los recientes solo duran esta visita.
    }
    return lista;
}

/** Las indicaciones de Google vienen en HTML; se dejan en texto plano. */
function textoPlano(html) {
    const doc = new DOMParser().parseFromString(html.replace(/<div/g, " · <div"), "text/html");
    return doc.body.textContent.replace(/\s+/g, " ").trim();
}

const iconoPaso = (paso) => (paso ? ICONOS_MANIOBRA[paso.maneuver] || "straight" : "flag");

export default function RecomendadorRutas({ mapa, google, position, velocidad, capa, onNavegando, avisar }) {
    const [consulta, setConsulta] = useState("");
    const [predicciones, setPredicciones] = useState([]);
    const [recientes, setRecientes] = useState(leerRecientes);
    const [destino, setDestino] = useState(null);
    const [rutas, setRutas] = useState([]);
    const [rSel, setRSel] = useState(0);
    const [calculando, setCalculando] = useState(false);
    const [error, setError] = useState(null);
    const [navegando, setNavegando] = useState(false);
    const [progreso, setProgreso] = useState({ paso: 0, idx: 0 });
    const [posProcesada, setPosProcesada] = useState(null);
    const [aviso, setAviso] = useState(null);
    const [ahora, setAhora] = useState(() => Date.now());

    const servicioRef = useRef(null);
    const sesionRef = useRef(null);
    const recorridoRef = useRef(null);
    const peticionRef = useRef(0);

    const vehiculo = position ? { lat: Number(position.latitud), lng: Number(position.longitud) } : null;
    const ruta = rutas[rSel] || null;

    // Capa de tráfico de Google mientras la pestaña está abierta
    useEffect(() => {
        if (!mapa || !google) return;
        const trafico = new google.maps.TrafficLayer();
        trafico.setMap(mapa);
        servicioRef.current = new google.maps.places.AutocompleteService();
        return () => trafico.setMap(null);
    }, [mapa, google]);

    useEffect(() => {
        onNavegando?.(navegando);
    }, [navegando, onNavegando]);

    useEffect(() => () => onNavegando?.(false), [onNavegando]);

    useEffect(() => {
        const id = setInterval(() => setAhora(Date.now()), 30000);
        return () => clearInterval(id);
    }, []);

    // Sugerencias de lugares en tiempo real (Rápido + Ordenado por cercanía a la moto)
    useEffect(() => {
        const texto = consulta.trim();
        if (!texto) {
            setPredicciones([]);
            return;
        }

        let activo = true;
        const id = setTimeout(async () => {
            let resFinal = [];

            // 1. Intentar con Google Places AutocompleteService
            if (servicioRef.current && google && google.maps) {
                try {
                    if (!sesionRef.current && google.maps.places && google.maps.places.AutocompleteSessionToken) {
                        sesionRef.current = new google.maps.places.AutocompleteSessionToken();
                    }

                    const boundsVal = (vehiculo && google.maps.LatLngBounds)
                        ? new google.maps.LatLngBounds(
                            { lat: vehiculo.lat - 0.2, lng: vehiculo.lng - 0.2 },
                            { lat: vehiculo.lat + 0.2, lng: vehiculo.lng + 0.2 }
                        )
                        : null;

                    servicioRef.current.getPlacePredictions(
                        {
                            input: texto,
                            componentRestrictions: { country: "co" },
                            ...(sesionRef.current && { sessionToken: sesionRef.current }),
                            ...(vehiculo && { origin: new google.maps.LatLng(vehiculo.lat, vehiculo.lng) }),
                            ...(boundsVal && { locationBias: boundsVal, locationRestriction: boundsVal })
                        },
                        (resultado, estado) => {
                            if (activo && estado === google.maps.places.PlacesServiceStatus.OK && resultado && resultado.length) {
                                resFinal = resultado;
                                setPredicciones(resultado);
                            }
                        }
                    );
                } catch (e) {
                    console.warn("Google Places Autocomplete error:", e);
                }
            }

            // 2. Consulta ultra-rápida paralela a Photon API (CORS habilitado, sin billing, acotado a la moto)
            try {
                const latParam = vehiculo ? `&lat=${vehiculo.lat}&lon=${vehiculo.lng}` : "";
                const photonRes = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(texto)}${latParam}&limit=8`);
                const photonData = await photonRes.json();

                if (activo && photonData && Array.isArray(photonData.features) && photonData.features.length) {
                    const mappedPhoton = photonData.features.map((feat) => {
                        const [itemLng, itemLat] = feat.geometry.coordinates;
                        const props = feat.properties;
                        const mainName = props.name || props.street || props.city || texto;
                        const subName = [props.street, props.district, props.city, props.state].filter(Boolean).join(", ");
                        const distKm = vehiculo ? distancia(vehiculo, { lat: itemLat, lng: itemLng }) / 1000 : 9999;
                        return {
                            place_id: null,
                            nombre: mainName,
                            sub: subName || "Colombia",
                            lat: itemLat,
                            lng: itemLng,
                            distanciaKm: distKm
                        };
                    });

                    // Ordenar por cercanía a la ubicación de la moto
                    mappedPhoton.sort((a, b) => a.distanciaKm - b.distanciaKm);

                    if (!resFinal.length) {
                        setPredicciones(mappedPhoton);
                    }
                }
            } catch (errPhoton) {
                console.warn("Error en autocompletado Photon:", errPhoton);
            }
        }, 200);

        return () => {
            activo = false;
            clearTimeout(id);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [consulta, google]);

    // Rutas sobre el mapa
    useEffect(() => {
        if (!mapa || !google || !ruta) return;
        const capas = [];

        if (!navegando) {
            rutas.forEach((r, k) => {
                if (k === rSel) return;
                const alterna = new google.maps.Polyline({ path: r.puntos, map: mapa, strokeColor: "#5f675c", strokeOpacity: 0.85, strokeWeight: 6 });
                alterna.addListener("click", () => setRSel(k));
                capas.push(alterna);
            });
        }

        capas.push(new google.maps.Polyline({ path: ruta.puntos, map: mapa, clickable: false, strokeColor: "#0f120e", strokeOpacity: 0.9, strokeWeight: 12 }));
        capas.push(new google.maps.Polyline({ path: ruta.puntos, map: mapa, clickable: false, strokeColor: COLORES_TRAFICO[ruta.nivel], strokeOpacity: 1, strokeWeight: 6 }));

        if (navegando) {
            recorridoRef.current = new google.maps.Polyline({ path: [], map: mapa, clickable: false, strokeColor: "#2a3127", strokeOpacity: 1, strokeWeight: 7 });
            capas.push(recorridoRef.current);
        }

        capas.push(crearMarcadorHtml(google, {
            mapa,
            posicion: ruta.puntos[ruta.puntos.length - 1],
            html: htmlIconoCircular("flag", "#b2cea8", 36),
            ancho: 36,
            alto: 36,
            zIndex: 5,
        }));

        return () => {
            capas.forEach((c) => c.setMap(null));
            recorridoRef.current = null;
        };
    }, [mapa, google, rutas, rSel, ruta, navegando]);

    useEffect(() => {
        if (ruta && !navegando) encuadrar(google, mapa, ruta.puntos);
    }, [ruta, navegando, google, mapa]);

    // Avance de la navegación con cada posición nueva de la unidad. Se busca el
    // punto más cercano solo en los pasos siguientes, para no retroceder.
    if (navegando && ruta && vehiculo && position !== posProcesada) {
        setPosProcesada(position);
        const pasos = ruta.leg.steps;

        let mejor = progreso;
        let menor = Infinity;
        for (let k = progreso.paso; k <= Math.min(pasos.length - 1, progreso.paso + 3); k++) {
            pasos[k].path.forEach((p, j) => {
                const d = distancia(vehiculo, aLiteral(p));
                if (d < menor) {
                    menor = d;
                    mejor = { paso: k, idx: j };
                }
            });
        }

        if (distancia(vehiculo, aLiteral(ruta.leg.end_location)) < LLEGADA_METROS) {
            terminar(true);
        } else if (mejor.paso !== progreso.paso || mejor.idx !== progreso.idx) {
            setProgreso(mejor);
        }
    }

    // Tramo ya recorrido, en gris sobre la ruta
    useEffect(() => {
        if (!navegando || !ruta || !recorridoRef.current) return;
        const pasos = ruta.leg.steps;
        const recorrido = pasos.slice(0, progreso.paso).flatMap((p) => p.path)
            .concat(pasos[progreso.paso].path.slice(0, progreso.idx + 1))
            .map(aLiteral);
        if (position) recorrido.push({ lat: Number(position.latitud), lng: Number(position.longitud) });
        recorridoRef.current.setPath(recorrido);
    }, [navegando, ruta, progreso, position]);

    useEffect(() => {
        if (aviso) avisar?.(aviso.texto);
    }, [aviso, avisar]);

    const elegirDestino = (lugar) => {
        if (!google) return;
        sesionRef.current = null;
        setRecientes((prev) => guardarReciente(lugar, prev));
        setDestino(lugar);
        setRutas([]);
        setRSel(0);
        setError(null);

        if (!vehiculo) {
            setError("Aún no hay posición de la unidad para calcular la ruta.");
            return;
        }

        const peticion = ++peticionRef.current;
        setCalculando(true);

        const destinoArg = (lugar.lat != null && lugar.lng != null)
            ? new google.maps.LatLng(Number(lugar.lat), Number(lugar.lng))
            : lugar.placeId
                ? { placeId: lugar.placeId }
                : lugar.nombre;

        const ds = new google.maps.DirectionsService();

        const intentarRuta = (conTrafico) => {
            const req = {
                origin: new google.maps.LatLng(vehiculo.lat, vehiculo.lng),
                destination: destinoArg,
                travelMode: google.maps.TravelMode.DRIVING,
                provideRouteAlternatives: true,
            };
            if (conTrafico) {
                req.drivingOptions = { departureTime: new Date(), trafficModel: "bestguess" };
            }
            return ds.route(req);
        };

        const fallbackOSRM = async () => {
            try {
                let destLat = lugar.lat;
                let destLng = lugar.lng;

                if (!destLat || !destLng) {
                    if (google && google.maps && google.maps.Geocoder) {
                        try {
                            const geocoder = new google.maps.Geocoder();
                            const subLimpia = (lugar.sub && !lugar.sub.includes("Búsqueda") && !lugar.sub.includes("Calcular") && !lugar.sub.includes("Presiona")) ? `, ${lugar.sub}` : "";
                            const textoBusqueda = lugar.nombre + subLimpia;
                            
                            const gRes = await geocoder.geocode({
                                address: textoBusqueda,
                                location: new google.maps.LatLng(vehiculo.lat, vehiculo.lng),
                                bounds: new google.maps.LatLngBounds(
                                    { lat: vehiculo.lat - 0.2, lng: vehiculo.lng - 0.2 },
                                    { lat: vehiculo.lat + 0.2, lng: vehiculo.lng + 0.2 }
                                )
                            });
                            if (gRes.results && gRes.results[0]) {
                                const loc = gRes.results[0].geometry.location;
                                destLat = loc.lat();
                                destLng = loc.lng();
                            }
                        } catch (gErr) {
                            console.warn("Geocoder falló:", gErr);
                        }
                    }
                }

                if (!destLat || !destLng) {
                    try {
                        const latParam = vehiculo ? `&lat=${vehiculo.lat}&lon=${vehiculo.lng}` : "";
                        const photonRes = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(lugar.nombre)}${latParam}&limit=3`);
                        const photonData = await photonRes.json();
                        if (photonData && Array.isArray(photonData.features) && photonData.features.length) {
                            const [fLng, fLat] = photonData.features[0].geometry.coordinates;
                            destLat = fLat;
                            destLng = fLng;
                        }
                    } catch (pErr) {
                        console.warn("Photon fallback geocode error:", pErr);
                    }
                }

                if (!destLat || !destLng) {
                    throw new Error("No se obtuvieron coordenadas del destino");
                }

                const url = `https://router.project-osrm.org/route/v1/driving/${vehiculo.lng},${vehiculo.lat};${destLng},${destLat}?overview=full&geometries=geojson&steps=true`;
                const osrmRes = await fetch(url);
                const osrmData = await osrmRes.json();

                if (!osrmData.routes || !osrmData.routes.length) {
                    throw new Error("Sin rutas disponibles en OSRM");
                }

                const r0 = osrmData.routes[0];
                const puntos = r0.geometry.coordinates.map(([lng, lat]) => ({ lat, lng }));

                const steps = r0.legs[0].steps.map((st) => ({
                    instructions: st.name ? `Conducir por ${st.name}` : "Sigue la vía principal",
                    distance: { value: st.distance, text: formatearDistancia(st.distance) },
                    duration: { value: st.duration },
                    maneuver: st.maneuver ? st.maneuver.type : "straight",
                    path: st.geometry ? st.geometry.coordinates.map(([lng, lat]) => ({ lat, lng })) : [],
                    end_location: st.geometry && st.geometry.coordinates.length ? { lat: st.geometry.coordinates[st.geometry.coordinates.length - 1][1], lng: st.geometry.coordinates[st.geometry.coordinates.length - 1][0] } : { lat: destLat, lng: destLng }
                }));

                const leg = {
                    distance: { value: r0.distance, text: formatearDistancia(r0.distance) },
                    duration: { value: r0.duration },
                    duration_in_traffic: { value: r0.duration },
                    end_location: { lat: destLat, lng: destLng },
                    steps: steps
                };

                if (peticion === peticionRef.current) {
                    setRutas([{
                        leg,
                        puntos,
                        metros: r0.distance,
                        segundos: r0.duration,
                        via: "Ruta calculada (Vía Libre)",
                        nivel: 0
                    }]);
                    setError(null);
                }
            } catch (fallbackErr) {
                console.error("Error en OSRM fallback:", fallbackErr);
                if (peticion === peticionRef.current) {
                    setError("No se pudo obtener la ruta. Puedes usar la navegación externa en Google Maps.");
                }
            }
        };

        intentarRuta(true)
            .catch(() => intentarRuta(false))
            .then((resultado) => {
                if (peticion !== peticionRef.current) return;
                const lista = resultado.routes.map((r) => {
                    const leg = r.legs[0];
                    const dur = leg.duration.value;
                    const durTrafico = leg.duration_in_traffic?.value ?? dur;
                    const proporcion = durTrafico / dur;
                    return {
                        leg,
                        puntos: r.overview_path.map(aLiteral),
                        metros: leg.distance.value,
                        segundos: durTrafico,
                        via: r.summary ? `Por ${r.summary}` : "Ruta urbana",
                        nivel: proporcion < 1.1 ? 0 : proporcion < 1.35 ? 1 : 2,
                    };
                }).sort((a, b) => a.segundos - b.segundos);
                setRutas(lista);
            })
            .catch((err) => {
                console.warn("DirectionsService falló, ejecutando fallback de navegación...", err);
                return fallbackOSRM();
            })
            .finally(() => peticion === peticionRef.current && setCalculando(false));
    };

    const cambiarDestino = () => {
        peticionRef.current++;
        setDestino(null);
        setRutas([]);
        setCalculando(false);
        setError(null);
    };

    const iniciar = () => {
        if (!ruta) return;
        setProgreso({ paso: 0, idx: 0 });
        setPosProcesada(null);
        setNavegando(true);
        mapa?.setZoom(17);
        if (vehiculo) mapa?.panTo(vehiculo);
    };

    function terminar(llegada) {
        // Se llama también durante el render (al llegar), así que solo toca estado.
        const nombre = destino?.nombre;
        setNavegando(false);
        setDestino(null);
        setRutas([]);
        setError(null);
        setConsulta("");
        setAviso({ texto: llegada ? `Llegaste a ${nombre}` : "Navegación terminada" });
    }

    // ── Vista: navegación activa ─────────────────────────────
    if (navegando && ruta) {
        const pasos = ruta.leg.steps;
        const actual = pasos[progreso.paso];
        const siguiente = pasos[progreso.paso + 1];
        const luego = pasos[progreso.paso + 2];

        const hastaManiobra = vehiculo ? distancia(vehiculo, aLiteral(actual.end_location)) : actual.distance.value;
        const restante = hastaManiobra + pasos.slice(progreso.paso + 1).reduce((a, p) => a + p.distance.value, 0);
        const segundosRestantes = (restante / ruta.metros) * ruta.segundos;

        return (
            <>
                <div className="pc-cuerpo">
                    <div className="pc-encabezado-seccion">
                        <div className="pc-sobretitulo">Hacia {destino?.nombre}</div>
                        <div className="pc-titulo">Indicaciones</div>
                    </div>
                    <ol className="pc-pasos">
                        {pasos.slice(progreso.paso).map((p, k) => (
                            <li key={progreso.paso + k} className={k === 0 ? "pasado" : k === 1 ? "proximo" : ""}>
                                <span className="material-symbols-outlined">{iconoPaso(p)}</span>
                                <span className="pc-paso-texto">{textoPlano(p.instructions)}</span>
                                <span className="pc-nota">{formatearDistancia(p.distance.value)}</span>
                            </li>
                        ))}
                    </ol>
                </div>

                {capa && createPortal(
                    <>
                        <div className="pc-nav-banner-zona">
                            <div className="pc-nav-banner">
                                <div className="pc-nav-banner-principal">
                                    <div className="pc-nav-maniobra">
                                        <span className="material-symbols-outlined">{iconoPaso(siguiente)}</span>
                                    </div>
                                    <div className="pc-nav-banner-texto">
                                        <div className="pc-nav-distancia">{formatearDistancia(hastaManiobra)}</div>
                                        <div className="pc-nav-instruccion">{siguiente ? textoPlano(siguiente.instructions) : "Llegas a tu destino"}</div>
                                    </div>
                                </div>
                                <div className="pc-nav-luego">
                                    <strong>Luego</strong>
                                    <span className="material-symbols-outlined">{iconoPaso(luego)}</span>
                                    <span>{luego ? textoPlano(luego.instructions) : "Destino a la vista"}</span>
                                </div>
                            </div>
                        </div>

                        <div className="pc-nav-barra-zona">
                            <div className="pc-nav-barra">
                                <div className="pc-nav-velocimetro">
                                    <span>{velocidad}</span>
                                    <small>KM/H</small>
                                </div>
                                <div className="pc-nav-resumen">
                                    <span className="pc-nav-eta">{horaMinutos(ahora + segundosRestantes * 1000)}</span>
                                    <span><strong>{Math.max(1, Math.round(segundosRestantes / 60))}</strong> min</span>
                                    <span><strong>{decimal(restante / 1000)}</strong> km</span>
                                </div>
                                <button className="pc-nav-terminar" onClick={() => terminar(false)} title="Terminar navegación" aria-label="Terminar navegación">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                        </div>
                    </>,
                    capa,
                )}
            </>
        );
    }

    // ── Vista: búsqueda y elección de ruta ───────────────────
    const lugaresListados = consulta.trim()
        ? predicciones.map((p) => {
            if (p.structured_formatting) {
                return {
                    placeId: p.place_id,
                    nombre: p.structured_formatting.main_text,
                    sub: p.structured_formatting.secondary_text || "",
                    distancia: p.distance_meters,
                    lat: p.lat || null,
                    lng: p.lng || null,
                };
            }
            return {
                placeId: p.place_id || null,
                nombre: p.nombre || p.main_text || p.display_name?.split(",")[0] || "Lugar",
                sub: p.sub || p.secondary_text || p.display_name?.split(",").slice(1, 3).join(",").trim() || "",
                distancia: p.distancia || null,
                lat: p.lat ? parseFloat(p.lat) : null,
                lng: p.lng || p.lon ? parseFloat(p.lng || p.lon) : null,
            };
        })
        : recientes;

    return (
        <div className="pc-cuerpo">
            <div className="pc-encabezado-seccion">
                <div className="pc-sobretitulo">Navegación con tráfico</div>
                <div className="pc-titulo">¿A dónde vas?</div>
            </div>

            {!destino && (
                <>
                    <form
                        className="pc-buscador"
                        onSubmit={(e) => {
                            e.preventDefault();
                            if (consulta.trim()) {
                                elegirDestino({ placeId: null, nombre: consulta.trim(), sub: "Búsqueda directa" });
                            }
                        }}
                    >
                        <span className="material-symbols-outlined">search</span>
                        <input
                            value={consulta}
                            onChange={(e) => {
                                setConsulta(e.target.value);
                                if (!e.target.value.trim()) setPredicciones([]);
                            }}
                            placeholder="Escribe un lugar y presiona Enter..."
                            aria-label="Buscar destino"
                        />
                    </form>

                    <div className="pc-lista-compacta">
                        {consulta.trim() && (
                            <button
                                className="pc-lugar"
                                style={{ background: "rgba(178, 206, 168, 0.12)", border: "1px solid rgba(178, 206, 168, 0.3)" }}
                                onClick={() => elegirDestino({ placeId: null, nombre: consulta.trim(), sub: "Calcular ruta a este destino" })}
                            >
                                <span className="pc-lugar-icono">
                                    <span className="material-symbols-outlined" style={{ color: "#b2cea8" }}>near_me</span>
                                </span>
                                <span className="pc-fila-texto">
                                    <span className="pc-lugar-nombre">Ir a "{consulta.trim()}"</span>
                                    <span className="pc-nota">Presiona Enter o clic para calcular ruta</span>
                                </span>
                            </button>
                        )}

                        {lugaresListados.length > 0 && (
                            <div className="pc-rotulo">{consulta.trim() ? "SUGERENCIAS" : "RECIENTES"}</div>
                        )}
                        {!consulta.trim() && !recientes.length && (
                            <div className="pc-estado">Escribe una dirección, barrio o ciudad y presiona Enter.</div>
                        )}
                        {lugaresListados.map((l, idx) => (
                            <button key={l.placeId || idx} className="pc-lugar" onClick={() => elegirDestino(l)}>
                                <span className="pc-lugar-icono">
                                    <span className="material-symbols-outlined">{consulta.trim() ? "location_on" : "history"}</span>
                                </span>
                                <span className="pc-fila-texto">
                                    <span className="pc-lugar-nombre">{l.nombre}</span>
                                    <span className="pc-nota">{l.sub}</span>
                                </span>
                                {vehiculo && l.distancia != null && (
                                    <span className="pc-nota">{formatearDistancia(l.distancia)}</span>
                                )}
                            </button>
                        ))}
                    </div>
                </>
            )}

            {destino && (
                <>
                    <div className="pc-destino">
                        <span className="material-symbols-outlined icono-relleno">location_on</span>
                        <div className="pc-fila-texto">
                            <span className="pc-lugar-nombre">{destino.nombre}</span>
                            <span className="pc-nota">{destino.sub}</span>
                        </div>
                        <button className="pc-boton-chico" onClick={cambiarDestino}>Cambiar</button>
                    </div>

                    {calculando && <div className="pc-estado">Calculando rutas con el tráfico actual…</div>}
                    {error && <div className="pc-estado">{error}</div>}

                    <div className="pc-lista">
                        {rutas.map((r, k) => (
                            <button key={k} className={`pc-ruta ${k === rSel ? "activo" : ""}`} onClick={() => setRSel(k)}>
                                <span className="pc-ruta-fila">
                                    <span className="pc-ruta-minutos">{Math.max(1, Math.round(r.segundos / 60))}<small> min</small></span>
                                    <span className="pc-nota">{decimal(r.metros / 1000)} km · llegada {horaMinutos(ahora + r.segundos * 1000)}</span>
                                </span>
                                <span className="pc-ruta-fila pc-ruta-fila-izq">
                                    <span className={`pc-etiqueta ${k === 0 ? "acento" : ""}`}>
                                        {k === 0 ? "MÁS RÁPIDA" : `+${Math.max(1, Math.round((r.segundos - rutas[0].segundos) / 60))} MIN`}
                                    </span>
                                    <span className="pc-nota pc-recortar">{r.via} · {NOMBRES_TRAFICO[r.nivel]}</span>
                                </span>
                                <span className="pc-ruta-trafico" style={{ background: COLORES_TRAFICO[r.nivel] }} />
                            </button>
                        ))}
                    </div>

                    {rutas.length > 0 && !calculando && (
                        <>
                            <button className="pc-boton-principal" onClick={iniciar}>
                                <span className="material-symbols-outlined icono-relleno">navigation</span>Ir ahora
                            </button>
                            <div className="pc-leyenda">
                                {NOMBRES_TRAFICO.map((n, k) => (
                                    <span key={n}><i style={{ background: COLORES_TRAFICO[k] }} />{["Fluido", "Moderado", "Congestión"][k]}</span>
                                ))}
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    );
}
