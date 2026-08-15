import { GoogleMap, useJsApiLoader, Polyline } from "@react-google-maps/api";
import { useState, useRef, useEffect } from "react";
import { useGpsSocket } from "../Service/GpsDataService";
import carIcon from "../assets/motorcycle.svg";
import "../Styles/MapaGPS.css";

const IMEI = "0863874084559974";
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const ANIMATION_DURATION = 1000;

const centroDefault = { lat: 10.425, lng: -75.5402 };

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function MapaGPS() {
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  });

  const { position, connected } = useGpsSocket(IMEI);
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

  if (!isLoaded) return <div>Cargando mapa...</div>;

  return (
    <div>
      <GoogleMap
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