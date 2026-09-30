# Pendientes y Pasos Siguientes - RompGPS

Este documento detalla las tareas pendientes de configuración y despliegue para llevar el proyecto **RompGPS** a producción.

---

## 1. Configuración de API Keys y Credenciales de Entorno

- [ ] **Google Maps Platform (`FrontEnd/.env`)**:
  - Obtener la API Key real en la Consola de Google Cloud.
  - Habilitar las APIs: **Maps JavaScript API**, **Directions API** (para recomendación de rutas) y **Places API** (autocompletado).
  - Actualizar `VITE_GOOGLE_MAPS_API_KEY=AIzaSy...` en `FrontEnd/.env`.

- [ ] **Hablame.co SMS (`BackEnd/.env`)**:
  - Crear cuenta de comercio en [Hablame.co](https://hablame.co).
  - Configurar las credenciales en `BackEnd/.env`:
    ```env
    HABLAME_ACCOUNT=tu_cuenta
    HABLAME_API_KEY=tu_api_key
    HABLAME_TOKEN=tu_token
    ```
  - *Nota: Actualmente el sistema opera en modo simulación escribiendo en los logs del servidor para pruebas sin costo.*

- [ ] **Pasarela de Pagos Wompi (`BackEnd/.env` y `FrontEnd/.env`)**:
  - Configurar la llave pública de producción en `FrontEnd/.env`: `VITE_WOMPI_PUB_KEY=pub_prod_...`.
  - Configurar el secreto de eventos en `BackEnd/.env`: `WOMPI_EVENTS_SECRET=prod_events_...`.

---

## 2. Infraestructura y Despliegue de Servidores

- [ ] **Aprovisionamiento de VPS Único (Hetzner / DigitalOcean)**:
  - Crear VPS con 2 vCPU, 4GB RAM y **Dirección IP Pública IPv4 Estática**.
  - Abrir puertos de red en el Firewall/Security Group:
    - `8090` TCP (Servidor Netty GT06 GPS Listener).
    - `8081` TCP (Spring Boot Backend REST + WebSocket STOMP).
    - `443` TCP (HTTPS/WSS con Nginx reverse proxy y certificado SSL Let's Encrypt).

- [ ] **Despliegue del Frontend (Vercel / Cloudflare Pages)**:
  - Conectar el repositorio GitHub con Vercel/Cloudflare.
  - Configurar la variable de entorno `VITE_API_URL=https://api.tudominio.com`.

- [ ] **Registro de Webhook Wompi**:
  - Registrar la URL del webhook en el panel de control de Wompi: `https://api.tudominio.com/pagos/wompi/webhook`.

---

## 3. Pruebas de Campo con Rastreadores GPS GT06

- [ ] Configurar el parámetro de servidor en el dispositivo GPS físico GT06 mediante comando SMS:
  ```text
  SERVER,666666,1,IP_PUBLICA_VPS,8090,0#
  ```
- [ ] Verificar la recepción continua de tramas en el log del `Servidor-TCP` y la transmisión en tiempo real hacia la aplicación React vía WebSocket STOMP.
