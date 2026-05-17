import { GoogleMap, useJsApiLoader, Marker, InfoWindow, Polyline } from "@react-google-maps/api";
import { useState, useRef, useEffect } from "react";
import { useGpsSocket } from "../Service/GpsDataService";
import carIcon from "../assets/motorcycle.svg";
import "../Styles/MapaGPS.css"

const IMEI = "0863874084559974";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const centroDefault = {
  lat: 10.425,
  lng: -75.5402,
};

function MapaGPS() {
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  });


  const { position, connected } = useGpsSocket(IMEI);
  const [path, setPath] = useState([]);
  const mapRef = useRef(null);

  useEffect(() => {
    if (position && mapRef.current) {
      const nuevaPosicion = {
        lat: Number(position.latitud),
        lng: Number(position.longitud),
      };
      mapRef.current.panTo(nuevaPosicion);
      mapRef.current.setZoom(17);
      setPath((prev) => [...prev, nuevaPosicion]);
    }
  }, [position]);

  const darkMapStyle = [
    {
      elementType: "geometry",
      stylers: [{ color: "#121412" }], // fondo principal
    },
    {
      elementType: "labels.text.stroke",
      stylers: [{ color: "#121412" }],
    },
    {
      elementType: "labels.text.fill",
      stylers: [{ color: "#9ea89e" }], // texto suave
    },
    {
      featureType: "administrative.locality",
      elementType: "labels.text.fill",
      stylers: [{ color: "#dce4dc" }],
    },
    {
      featureType: "poi",
      elementType: "labels.text.fill",
      stylers: [{ color: "#6e8a66" }],
    },
    {
      featureType: "road",
      elementType: "geometry",
      stylers: [{ color: "#1a1e1a" }], // superficie
    },
    {
      featureType: "road",
      elementType: "geometry.stroke",
      stylers: [{ color: "#383e38" }],
    },
    {
      featureType: "road.highway",
      elementType: "geometry",
      stylers: [{ color: "#3a5235" }], // verde principal oscuro
    },
    {
      featureType: "road.highway",
      elementType: "geometry.stroke",
      stylers: [{ color: "#86A17D" }],
    },
    {
      featureType: "water",
      elementType: "geometry",
      stylers: [{ color: "#0d100d" }],
    },
    {
      featureType: "landscape",
      elementType: "geometry",
      stylers: [{ color: "#161916" }],
    },
  ];

  if (!isLoaded) {
    return (
      <div >
        Cargando mapa...
      </div>
    );
  }
  return (
    <div>
      <GoogleMap
        mapContainerClassName="map-container"
        center={centroDefault}
        zoom={100}
        onLoad={(map) => {
          mapRef.current = map
        }}
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
        {position && (
          <Marker
            position={{
              lat: Number(position.latitud),
              lng: Number(position.longitud),
            }}
            icon={{
              url: carIcon,
              scaledSize: new window.google.maps.Size(
                50,
                50
              ),
              anchor: new window.google.maps.Point(
                25,
                25
              ),
            }}
          >
          </Marker>
        )}
      </GoogleMap>
    </div>
  )

}

export default MapaGPS;