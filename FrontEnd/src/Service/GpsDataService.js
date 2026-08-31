import { useEffect, useState } from "react";
import { Client } from "@stomp/stompjs";
import { obtenerToken } from "./sesion";
import { urlWebSocket } from "./api";

/**
 * Suscripción a las posiciones en vivo de un dispositivo.
 *
 * CAMBIOS:
 *
 * 1. AUTENTICACIÓN. Se envía el JWT en connectHeaders. El backend ahora exige
 *    un token válido en el frame CONNECT y comprueba en el SUBSCRIBE que el
 *    IMEI sea del usuario. Antes el canal estaba abierto y cualquiera podía
 *    escuchar cualquier vehículo sin identificarse.
 *
 * 2. URL. Sale de VITE_API_URL en lugar de estar escrita a mano.
 *
 * 3. ERRORES VISIBLES. Antes solo se registraba en consola; ahora el hook
 *    devuelve `error` para que la interfaz pueda mostrar qué pasó.
 *
 * Nota de uso: este hook abre una conexión por cada componente que lo invoca.
 * PanelControl lo llama una sola vez y le pasa la posición a Mapa por props;
 * antes lo llamaban los dos y se abrían dos clientes STOMP al mismo topic.
 */
export function useGpsSocket(imei) {
  const [position, setPosition] = useState(null);
  const [connected, setConnected] = useState(false);
  const [errorConexion, setErrorConexion] = useState(null);

  const token = obtenerToken();

  useEffect(() => {
    if (!imei || !token) return;

    const client = new Client({
      brokerURL: urlWebSocket(),

      // El token viaja en el frame CONNECT, no en la URL: una URL con el token
      // acabaría en los logs del servidor y en el historial del navegador.
      connectHeaders: { Authorization: `Bearer ${token}` },

      onConnect: () => {
        setConnected(true);
        setErrorConexion(null);

        client.subscribe(`/socket/gps/${imei}`, (mensaje) => {
          try {
            setPosition(JSON.parse(mensaje.body));
          } catch {
            setErrorConexion("Mensaje de posición ilegible");
          }
        });
      },

      onStompError: (frame) => {
        // El servidor rechaza el CONNECT o el SUBSCRIBE: token inválido, cuenta
        // desactivada, o IMEI que no pertenece a este usuario.
        setConnected(false);
        setErrorConexion(frame.headers?.message || "No se pudo conectar al servidor");
      },

      onWebSocketError: () => {
        setConnected(false);
        setErrorConexion("Sin conexión con el servidor");
      },

      onDisconnect: () => setConnected(false),

      reconnectDelay: 5000,
    });

    client.activate();

    return () => {
      client.deactivate();
    };
  }, [imei, token]);

  // El error de "sin sesión" se deriva del token en vez de fijarse con
  // setState dentro del efecto, que provocaba renders en cascada.
  const error = !token ? "Sesión no iniciada" : errorConexion;

  return { position, connected, error };
}
