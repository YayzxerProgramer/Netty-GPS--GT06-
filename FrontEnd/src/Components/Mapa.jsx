import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from "@react-google-maps/api"
import { useState } from "react"
import { useGpsSocket } from "../hooks/useGpsSocket"

const IMEI = "0863874084559974"
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY

const estiloContenedor = { width: "100%", height: "500px" }
const centroDefault = { lat: 10.9685, lng: -74.7813 }

function MapaGPS() {
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  })

  const { position, connected } = useGpsSocket(IMEI)
  const [infoAbierta, setInfoAbierta] = useState(false)

  if (!isLoaded) return <p>Cargando mapa...</p>

  const centro = position
    ? { lat: position.latitud, lng: position.longitud }
    : centroDefault

  return (
    <div>
      <div style={{ marginBottom: "8px" }}>
        <span style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          padding: "6px 12px",
          background: "#1c211d",
          borderRadius: "999px",
          fontSize: "12px",
          color: connected ? "#b2cea8" : "#999",
        }}>
          <span style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: connected ? "#b2cea8" : "#666",
          }} />
          {connected
            ? position ? `${position.velocidad} km/h` : "Conectado, esperando datos..."
            : "Desconectado"}
        </span>
      </div>

      <GoogleMap
        mapContainerStyle={estiloContenedor}
        center={centro}
        zoom={15}
      >
        {position && (
          <Marker
            position={{ lat: position.latitud, lng: position.longitud }}
            onClick={() => setInfoAbierta(true)}
          >
            {infoAbierta && (
              <InfoWindow onCloseClick={() => setInfoAbierta(false)}>
                <div style={{ color: "#000", fontSize: "13px", lineHeight: "1.8" }}>
                  <strong>IMEI:</strong> {position.imei}<br />
                  <strong>Velocidad:</strong> {position.velocidad} km/h<br />
                  <strong>GPS válido:</strong> {position.gpsValido ? "Sí" : "No"}<br />
                  <strong>ACC:</strong> {position.acc ? "Encendido" : "Apagado"}<br />
                  <strong>Lat:</strong> {position.latitud}<br />
                  <strong>Lon:</strong> {position.longitud}
                </div>
              </InfoWindow>
            )}
          </Marker>
        )}
      </GoogleMap>
    </div>
  )
}

export default MapaGPS