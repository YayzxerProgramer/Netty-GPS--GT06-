import { GoogleMap, useJsApiLoader, Polyline } from "@react-google-maps/api";
import { useState, useRef, useEffect } from "react";
import carIcon from "../assets/motorcycle.svg";
import "../Styles/MapaGPS.css";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const ANIMATION_DURATION = 1000;
const GOOGLE_MAP_LIBRARIES = ["places"];

const centroDefault = { lat: 10.425, lng: -75.5402 };

function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Mapa de seguimiento.
 */
function MapaGPS({ position, connected, onMapLoad }) {
  const esClaveValida = GOOGLE_MAPS_API_KEY && GOOGLE_MAPS_API_KEY.startsWith("AIzaSy");

  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: esClaveValida ? GOOGLE_MAPS_API_KEY : "",
    libraries: GOOGLE_MAP_LIBRARIES,
  });

  const [path, setPath] = useState([]);
  const mapRef = useRef(null);

  const markerRef = useRef(null);     
  const animationRef = useRef(null);     // requestAnimationFrame ID
  const startPosRef = useRef(null);      // posición donde empezó la animación
  const targetPosRef = useRef(null);     // posición destino
  const startTimeRef = useRef(null);     // timestamp de inicio

  // Cuando llega una nueva posición, arrancamos la animación
  useEffect(() => {
    if (!position || !markerRef.current) return;

    const newTarget = {
      lat: Number(position.latitud),
      lng: Number(position.longitud),
    };

    // Agregar al path para la Polyline
    setPath((prev) => [...prev, newTarget]);

    // Panear el mapa suavemente
    if (mapRef.current) {
      mapRef.current.panTo(newTarget);
      mapRef.current.setZoom(17);
    }

    // Posición actual del marcador como punto de inicio
    const currentPos = markerRef.current.getPosition();
    startPosRef.current = currentPos
      ? { lat: currentPos.lat(), lng: currentPos.lng() }
      : newTarget;
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

  // Callback cuando el mapa carga: creamos el Marker manualmente
  // para tener referencia directa y poder usar setPosition()
  const handleMapLoad = (map) => {
    mapRef.current = map;
    if (onMapLoad) {
      onMapLoad(map, window.google);
    }

    const marker = new window.google.maps.Marker({
      map,
      icon: {
        url: carIcon,
        scaledSize: new window.google.maps.Size(50, 50),
        anchor: new window.google.maps.Point(25, 25),
      },
    });

    markerRef.current = marker;
  };

  const darkMapStyle = [
    { elementType: "geometry", stylers: [{ color: "#121412" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#121412" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#9ea89e" }] },
    { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#dce4dc" }] },
    { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#6e8a66" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#1a1e1a" }] },
    { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#383e38" }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3a5235" }] },
    { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#86A17D" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#0d100d" }] },
    { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#161916" }] },
  ];

  if (!esClaveValida || loadError) {
    return (
      <div className="loading-screen" style={{ flexDirection: "column", padding: "2rem", textAlign: "center" }}>
        <div style={{ background: "rgba(30, 41, 59, 0.95)", padding: "28px", borderRadius: "16px", border: "1px solid #3B82F6", maxWidth: "550px", boxShadow: "0 20px 50px rgba(0,0,0,0.5)" }}>
          <span style={{ fontSize: "42px" }}>🗺️</span>
          <h3 style={{ color: "#60A5FA", margin: "14px 0 8px 0", fontSize: "20px" }}>Configuración de API Key de Google Maps Requerida</h3>
          <p style={{ fontSize: "14px", color: "#94A3B8", lineHeight: "1.5" }}>
            Para ver el mapa satelital en vivo, reproducir el historial y utilizar la recomendación de rutas, ingresa una API Key válida en <code style={{ color: "#F59E0B", fontWeight: "bold" }}>FrontEnd/.env</code>.
          </p>
          <div style={{ background: "#0F172A", padding: "12px", borderRadius: "8px", margin: "16px 0", fontSize: "13px", color: "#E2E8F0", fontFamily: "monospace", border: "1px solid #1E293B" }}>
            VITE_GOOGLE_MAPS_API_KEY=AIzaSy...
          </div>
          <p style={{ fontSize: "12px", color: "#64748B" }}>
            Crea la clave en Google Cloud Console activando: <i>Maps JavaScript API</i>, <i>Directions API</i> y <i>Places API</i>.
          </p>
        </div>
      </div>
    );
  }

  if (!isLoaded) return <div className="loading-screen">⚡ Cargando Mapa GPS Google...</div>;

  return (
    <div style={{ width: "100%", height: "100%", minHeight: "500px" }}>
      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "100%" }}
        mapContainerClassName="map-container"
        center={centroDefault}
        zoom={15}
        onLoad={handleMapLoad}
        options={{
          styles: darkMapStyle,
          disableDefaultUI: true,
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          gestureHandling: "greedy",
          clickableIcons: false,
        }}
      >
        {path.length > 1 && (
          <Polyline
            path={path}
            options={{
              strokeColor: "#22c55e",
              strokeOpacity: 1,
              strokeWeight: 4,
            }}
          />
        )}
      </GoogleMap>
    </div>
  );
}

export default MapaGPS;