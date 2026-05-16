import { GoogleMap, useJsApiLoader, Marker, InfoWindow, Polyline } from "@react-google-maps/api";
import { useState, useRef, useEffect } from "react";
import { useGpsSocket } from "../Service/GpsDataService";
import carIcon from "../assets/motorcycle.svg";
import "../Styles/MapaGPS.css"

const IMEI = "0863874084559974";

const GOOGLE_MAPS_API_KEY = "AIzaSyB34zK6C8x4r3eLMpLjilbMjcWFWsjmmFo";

console.log(GOOGLE_MAPS_API_KEY)

const estiloContenedor = {
  width: "100%",
  height: "100vh",
  borderRadius: "18px",
};

const centroDefault = {
  lat: 10.9685,
  lng: -74.7813,
};

function MapaGPS() {
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  });

  const { position, connected } = useGpsSocket(IMEI);
  const [infoAbierta, setInfoAbierta] = useState(false);
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
      stylers: [{ color: "#0f172a" }],
    },
    {
      elementType: "labels.text.stroke",
      stylers: [{ color: "#0f172a" }],
    },
    {
      elementType: "labels.text.fill",
      stylers: [{ color: "#94a3b8" }],
    },
    {
      featureType: "administrative.locality",
      elementType: "labels.text.fill",
      stylers: [{ color: "#cbd5e1" }],
    },
    {
      featureType: "poi",
      elementType: "labels.text.fill",
      stylers: [{ color: "#64748b" }],
    },
    {
      featureType: "road",
      elementType: "geometry",
      stylers: [{ color: "#1e293b" }],
    },
    {
      featureType: "road",
      elementType: "geometry.stroke",
      stylers: [{ color: "#334155" }],
    },
    {
      featureType: "water",
      elementType: "geometry",
      stylers: [{ color: "#020617" }],
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
    <div className="mapa-wrapper">
      <div className="status-container">
        <div className={`status - pill ${connected ? "online" : "offline"}`}>
          <div className={`status - dot ${connected ? "online" : "offline"}`} />
          {connected ? "GPS ONLINE" : "GPS OFFLINE"}
        </div>
        <div className="speed-pill">
          {position ? `🚗 ${position.velocidad} km / h` : "Esperando datos..."}
        </div>
      </div>
      <GoogleMap
        mapContainerClassName="map-container"
        center={centroDefault}
        zoom={15}
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
            onClick={() => setInfoAbierta(true)}
          >
            {infoAbierta && (
              <InfoWindow
                onCloseClick={() =>
                  setInfoAbierta(false)
                }
              >
                <div className="info-window">
                  <strong>IMEI:</strong>{" "}
                  {position.imei}
                  <br />
                  <strong>Velocidad:</strong>{" "}
                  {position.velocidad} km/h
                  <br />
                  <strong>GPS válido:</strong>{" "}
                  {position.gpsValido
                    ? "Sí"
                    : "No"}
                  <br />
                  <strong>ACC:</strong>{" "}
                  {position.acc
                    ? "Encendido"
                    : "Apagado"}
                  <br />
                  <strong>Lat:</strong>{" "}
                  {position.latitud}
                  <br />
                  <strong>Lon:</strong>{" "}
                  {position.longitud}
                </div>
              </InfoWindow>
            )}
          </Marker>
        )}
      </GoogleMap>
    </div>
  )

}

export default MapaGPS;