import { useEffect, useState } from "react"
import { Client } from "@stomp/stompjs"
import SockJS from "sockjs-client"

export function useGpsSocket(imei) {
  const [position, setPosition] = useState(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS("http://localhost:8081/ws-gps"),
      onConnect: () => {
        console.log("✅ WebSocket conectado")
        setConnected(true)
        client.subscribe(`/socket/gps/${imei}`, (message) => {
          console.log("Raw message:", message.body)
          const data = JSON.parse(message.body)
          console.log("Latitud:", data.latitud, "Longitud:", data.longitud)
          setPosition(data)
        })
      },
      onDisconnect: () => {
        console.log("❌ Desconectado")
        setConnected(false)
      },
      onStompError: (frame) => console.error("🔴 STOMP error:", frame),
      onWebSocketError: (e) => console.error("🔴 WS error:", e),
      reconnectDelay: 5000,
    })

    client.activate()
    return () => { client.deactivate() }
  }, [imei])

  return { position, connected }
}