import { GoogleMap, useJsApiLoader, Polyline } from "@react-google-maps/api";
import { useState, useRef, useEffect } from "react";
import iconoMoto from "../assets/motorcycle.svg";
import { ESTILO_MAPA, crearMarcadorHtml } from "./mapaUtils";
import "../Styles/MapaGPS.css";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const ANIMATION_DURATION = 1000;
const GOOGLE_MAP_LIBRARIES = ["places"];

const centroDefault = { lat: 10.425, lng: -75.5402 };

const OPCIONES_MAPA = {
  styles: ESTILO_MAPA,
  disableDefaultUI: true,
  gestureHandling: "greedy",
  clickableIcons: false,
  backgroundColor: "#0f120e",
};

const HTML_UNIDAD = `<div style="position:relative;width:48px;height:48px"><span style="position:absolute;inset:0;border-radius:50%;background:rgba(178,206,168,.35);animation:romp-ping 2s ease-out infinite"></span><div style="position:absolute;inset:6px;border-radius:50%;background:#b2cea8;box-shadow:0 0 28px rgba(178,206,168,.75),0 0 0 3px rgba(15,18,14,.8);display:grid;place-items:center"><img src="${iconoMoto}" alt="" style="width:22px;height:22px;filter:brightness(0);opacity:.78"></div></div>`;

function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Mapa de seguimiento.
 *
 * siguiendo: si es true, el mapa se centra en cada posición nueva.
 * atenuado:  baja la opacidad de la unidad y su estela (pestaña Historial).
 * onArrastre: el usuario movió el mapa a mano (deja de seguir a la unidad).
 */
function MapaGPS({ position, siguiendo = true, atenuado = false, onMapLoad, onArrastre }) {
  const esClaveValida = GOOGLE_MAPS_API_KEY && GOOGLE_MAPS_API_KEY.startsWith("AIzaSy");

  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: esClaveValida ? GOOGLE_MAPS_API_KEY : "",
    libraries: GOOGLE_MAP_LIBRARIES,
    language: "es",
    region: "CO",
  });

  const [path, setPath] = useState([]);
  const mapRef = useRef(null);

  const markerRef = useRef(null);
  const animationRef = useRef(null);     // requestAnimationFrame ID
  const startPosRef = useRef(null);      // posición donde empezó la animación
  const targetPosRef = useRef(null);     // posición destino
  const startTimeRef = useRef(null);     // timestamp de inicio
  const siguiendoRef = useRef(siguiendo);
  const onArrastreRef = useRef(onArrastre);
  const positionRef = useRef(position);

  useEffect(() => {
    siguiendoRef.current = siguiendo;
    onArrastreRef.current = onArrastre;
    positionRef.current = position;
  });

  // Cuando llega una nueva posición, arrancamos la animación
  useEffect(() => {
    if (!position || !markerRef.current) return;

    const newTarget = {
      lat: Number(position.latitud),
      lng: Number(position.longitud),
    };

    // Agregar al path para la Polyline
    setPath((prev) => [...prev, newTarget]);

    // Posición actual del marcador como punto de inicio
    const currentPos = markerRef.current.getPosition();

    // Con el primer fix se acerca el mapa a la unidad; después solo se panea
    // si el usuario no ha movido el mapa por su cuenta.
    if (mapRef.current) {
      if (!currentPos) {
        mapRef.current.setCenter(newTarget);
        mapRef.current.setZoom(16);
      } else if (siguiendoRef.current) {
        mapRef.current.panTo(newTarget);
      }
    }

    startPosRef.current = currentPos || newTarget;
    targetPosRef.current = newTarget;

    // Cancelar animación anterior si todavía corría
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    startTimeRef.current = performance.now();

    function animate(now) {
      const elapsed = now - startTimeRef.current;
      const t = Math.min(elapsed / ANIMATION_DURATION, 1); // 0 → 1

      // Easing suave: ease-out cúbico
      const eased = 1 - Math.pow(1 - t, 3);

      const interpolated = {
        lat: lerp(startPosRef.current.lat, targetPosRef.current.lat, eased),
        lng: lerp(startPosRef.current.lng, targetPosRef.current.lng, eased),
      };

      markerRef.current.setPosition(interpolated);

      if (t < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    }

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [position]);

  useEffect(() => {
    if (markerRef.current) markerRef.current.setOpacity(atenuado ? 0.35 : 1);
  }, [atenuado]);

  // Al volver a "seguir", el mapa salta a la unidad sin esperar al siguiente fix.
  useEffect(() => {
    const pos = markerRef.current?.getPosition();
    if (siguiendo && pos && mapRef.current) mapRef.current.panTo(pos);
  }, [siguiendo]);

  useEffect(() => () => {
    if (markerRef.current) markerRef.current.setMap(null);
  }, []);

  // Callback cuando el mapa carga: creamos el marcador manualmente
  // para tener referencia directa y poder usar setPosition()
  const handleMapLoad = (map) => {
    mapRef.current = map;

    markerRef.current = crearMarcadorHtml(window.google, {
      mapa: map,
      posicion: null,
      html: HTML_UNIDAD,
      ancho: 48,
      alto: 48,
      zIndex: 10,
    });

    // Si la posición llegó antes de que cargara el mapa, se coloca ya.
    if (positionRef.current) {
      const inicial = { lat: Number(positionRef.current.latitud), lng: Number(positionRef.current.longitud) };
      markerRef.current.setPosition(inicial);
      map.setCenter(inicial);
      map.setZoom(16);
      setPath([inicial]);
    }

    map.addListener("dragstart", () => onArrastreRef.current?.());

    if (onMapLoad) {
      onMapLoad(map, window.google);
    }
  };

  if (!esClaveValida || loadError) {
    return (
      <div className="mapa-aviso">
        <div className="mapa-aviso-tarjeta">
          <span className="material-symbols-outlined mapa-aviso-icono">map</span>
          <h3>Falta la API Key de Google Maps</h3>
          <p>
            Para ver el mapa en vivo, reproducir el historial y calcular rutas, agrega una clave válida en <code>FrontEnd/.env</code>:
          </p>
          <pre>VITE_GOOGLE_MAPS_API_KEY=AIzaSy...</pre>
          <p className="mapa-aviso-nota">
            Actívala en Google Cloud Console con <i>Maps JavaScript API</i>, <i>Directions API</i>, <i>Places API</i> y <i>Geocoding API</i>.
          </p>
        </div>
      </div>
    );
  }

  if (!isLoaded) return <div className="loading-screen">Cargando mapa…</div>;

  return (
    <GoogleMap
      mapContainerStyle={{ width: "100%", height: "100%" }}
      mapContainerClassName="map-container"
      center={centroDefault}
      zoom={15}
      onLoad={handleMapLoad}
      options={OPCIONES_MAPA}
    >
      {path.length > 1 && (
        <>
          <Polyline
            path={path}
            options={{ strokeColor: "#b2cea8", strokeOpacity: atenuado ? 0.04 : 0.14, strokeWeight: 12 }}
          />
          <Polyline
            path={path}
            options={{ strokeColor: "#b2cea8", strokeOpacity: atenuado ? 0.2 : 0.95, strokeWeight: 4 }}
          />
        </>
      )}
    </GoogleMap>
  );
}

export default MapaGPS;
