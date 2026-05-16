import { useEffect, useState } from "react";
import { Client } from "@stomp/stompjs";

export function useGpsSocket(imei) {
  const [position, setPosition] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!imei) return;

    const client = new Client({
      brokerURL: "ws://localhost:8081/ws-gps",
      onConnect: () => {
        setConnected(true);
        client.subscribe(`/socket/gps/${imei}`, (message) => {
          try {
            const data = JSON.parse(message.body);
            setPosition(data);
          } catch (err) {
            console.error("Error parsing JSON:", err);
          }
        });
      },
      reconnectDelay: 5000,
    });
    client.activate();
    return () => {
      client.deactivate();
    };
  }, [imei]);

  return { position, connected };
}