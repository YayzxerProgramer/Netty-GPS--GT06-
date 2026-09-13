# RompGPS — Rastreo GPS con protocolo GT06

Sistema de rastreo vehicular en tiempo real. Los dispositivos GT06 se conectan por TCP, el servidor decodifica el protocolo binario y reenvía las posiciones al backend, que las persiste y las difunde por WebSocket a la interfaz web.

```
Dispositivo GT06 ──TCP:9000──> Servidor-TCP ──HTTP──> BackEnd ──WebSocket──> FrontEnd
                                                          │
                                        PostgreSQL · MongoDB · Redis
```

| Módulo | Tecnología | Puerto | Responsabilidad |
|---|---|---|---|
| `Servidor-TCP/` | Spring Boot 3.4.3 + Netty | **9000** (TCP), 8080 (HTTP) | Decodifica GT06 y reenvía posiciones |
| `BackEnd/` | Spring Boot 3.4.3 | 8081 | API REST, autenticación, WebSocket |
| `FrontEnd/` | React 18 + Vite 5 | 5173 | Panel de control y panel administrativo |

**Persistencia:** PostgreSQL (usuarios y vehículos), MongoDB (histórico de posiciones), Redis (caché, sesiones y límite de intentos).

---

## Requisitos

- **JDK 17 o superior.** No hace falta Maven: cada módulo trae su wrapper (`./mvnw`).
- **Node.js 18 o superior.**
- **Docker** con Compose v2.

---

## Puesta en marcha

### 1. Variables de entorno

Hay tres archivos `.env`, uno por ámbito. Ninguno se versiona.

```bash
cp .env.example .env                                   # credenciales de las bases
cp BackEnd/.env.example BackEnd/.env                   # secretos del backend
cp Servidor-TCP/servidor-tpc/.env.example Servidor-TCP/servidor-tpc/.env
cp FrontEnd/.env.example FrontEnd/.env
```

Genera los secretos:

```bash
openssl rand -base64 48   # JWT_SECRET
openssl rand -hex 32      # GPS_INGESTA_API_KEY
```

Tres reglas que evitan los fallos más habituales:

1. Las contraseñas de `.env` (raíz) y `BackEnd/.env` **deben coincidir**: son las mismas bases de datos.
2. `GPS_INGESTA_API_KEY` **debe ser idéntica** en `BackEnd/.env` y en `Servidor-TCP/servidor-tpc/.env`. Si no, el backend rechaza las posiciones con 401 y se pierden todas las tramas.
3. Ningún secreto tiene valor por defecto: **si falta uno, la aplicación no arranca**. Es deliberado — antes arrancaba con el secreto que había commiteado en el repositorio.

### 2. Bases de datos

```bash
docker compose up -d
```

Levanta PostgreSQL (**5435**, no 5432), MongoDB (27017) y Redis (6379), los tres publicados solo en `127.0.0.1` y con autenticación.

> El puerto de PostgreSQL es 5435 porque en Windows el servicio nativo ocupa el 5432 y gana las conexiones a `localhost` por delante del proxy de Docker.

### 3. Migración de base de datos

Obligatoria la primera vez. `ddl-auto=update` **no altera columnas existentes**, así que las restricciones UNIQUE hay que aplicarlas a mano:

```bash
docker exec -i rompgps-postgres psql -U rompgps -d rompgps_users \
  < BackEnd/src/main/resources/db/migracion-01-seguridad.sql
```

Es idempotente. Antes de ejecutarla sobre datos existentes, revisa los duplicados con las consultas comentadas en la cabecera del `.sql`.

### 4. Arrancar los servicios

```bash
# BackEnd
cd BackEnd && ./mvnw spring-boot:run

# Servidor TCP
cd Servidor-TCP/servidor-tpc && ./mvnw spring-boot:run

# FrontEnd
cd FrontEnd && npm install && npm run dev
```

O todo de una vez:

```bash
node run.mjs
```

### 5. Primer administrador

El registro público **no puede crear administradores**. El primero lo crea un sembrador al arrancar, con `ADMIN_USUARIO` y `ADMIN_CONTRASENA` de `BackEnd/.env`. Solo actúa si no existe ningún ADMIN; si faltan las variables, el arranque no falla, solo avisa en el log.

---

## URLs

| Recurso | URL |
|---|---|
| Aplicación web | http://localhost:5173 |
| Panel administrativo | http://localhost:5173/admin |
| API | http://localhost:8081 |
| Documentación de la API | http://localhost:8081/swagger-ui.html |
| Estado del backend | http://localhost:8081/actuator/health |
| WebSocket de posiciones | ws://localhost:8081/ws-gps |
| Diagnóstico del servidor TCP | http://localhost:8080/data/ubicaciones |
| Escucha de dispositivos GT06 | `localhost:9000` (TCP puro) |

---

## Modelo de acceso

Tres roles: `ADMIN`, `USER`, `VIEWER`.

| Ámbito | Quién puede |
|---|---|
| `/admin/**` | Solo `ADMIN` |
| Datos de un usuario | El titular o un `ADMIN` |
| Vehículos y posiciones | El propietario o un `ADMIN` |
| Registro, login, OAuth | Público |
| `POST /gps` | Solo con la cabecera `X-API-Key` |
| WebSocket | Token válido, y solo los IMEI propios |

Detalles y decisiones de diseño en [DIAGNOSTICO.md](DIAGNOSTICO.md).

---

## Pruebas

```bash
cd Servidor-TCP/servidor-tpc && ./mvnw test   # decodificación GT06
cd BackEnd && ./mvnw test
cd FrontEnd && npm run lint
```

---

## Notas de desarrollo

- **No hay `mvn` en el PATH**: usa siempre `./mvnw` (o `mvnw.cmd` en PowerShell).
- El access token dura **15 minutos** y se renueva solo con el token de refresco. No hace falta volver a iniciar sesión.
- Cambiar la contraseña o desactivar una cuenta **revoca todas sus sesiones** de inmediato.
- Tras 5 intentos de login fallidos hay un bloqueo temporal, por IP y por cuenta de forma independiente.

## Trabajo pendiente

En [PENDIENTES.md](PENDIENTES.md).
