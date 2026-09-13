# Backlog — Netty-GPS (GT06)

> **Las cinco secciones de este backlog se ejecutaron.** Lo que queda abajo es
> el registro de lo hecho y lo que sigue realmente abierto, casi todo por
> depender de acciones fuera del código.

Complementa a [DIAGNOSTICO.md](DIAGNOSTICO.md) (auditoría original) y al
[README.md](README.md) (puesta en marcha).

---

## Lo que sigue abierto

### 🔴 Rotar el client secret de GitHub — **solo lo puede hacer una persona**

`BackEnd/.env` tiene el marcador `GITHUB_CLIENT_SECRET=ROTAR-ESTE-VALOR-EN-GITHUB`.

El valor anterior (`be5546…`) estuvo en un `application.properties` versionado y **sigue en el historial de git**: quitarlo del archivo no lo borra.

1. GitHub → Settings → Developer settings → OAuth Apps → Generate a new client secret.
2. Pegarlo en `BackEnd/.env`.
3. Reiniciar el backend.

Hasta entonces el login con GitHub no funciona (es lo correcto: prefiere fallar a usar un secreto comprometido).

Opcional: purgar el historial con `git filter-repo`. Cambia todos los hashes, así que hay que coordinarlo con el equipo.

### 🟡 Los secretos locales son de desarrollo

`JWT_SECRET`, las contraseñas de las bases y `GPS_INGESTA_API_KEY` se generaron con `openssl` para este entorno. **Para producción hay que generar otros distintos** y no reutilizar los de local.

### 🟡 Cola de envío en memoria

`PublicadorBackend` reintenta con espera creciente y descarta lo más antiguo si la cola se llena, pero vive en memoria: un reinicio del proceso pierde lo pendiente. Persistirla en disco (SQLite o un fichero) sería el siguiente paso si se necesita garantía total.

### 🟡 Integridad referencial vehículo ↔ usuario

`Vehiculo.id_usuario` sigue siendo un `UUID` plano, no una asociación `@ManyToOne`. `VehiculoService` comprueba que el usuario exista antes de asignar y hay un índice sobre la columna, pero **no hay clave foránea**: si alguien borra un usuario por SQL directo, sus vehículos quedan apuntando a un id inexistente.

Convertirlo en asociación JPA cambia la clave JSON `id_usuario`, que el frontend ya usa, así que hay que hacer los dos lados a la vez.

### 🟡 Cobertura de tests

Hay 15 tests sobre el protocolo GT06, que era lo más crítico y lo que no tenía ninguno. Falta:

- Reglas de `UsuarioService`: último admin, auto-degradación, contraseña actual.
- Los `@PreAuthorize` con `@WebMvcTest` + `@WithMockUser`.
- Testcontainers para las pruebas de integración, en lugar de depender del Docker local.
- Frontend: no hay ninguno.

### 🟡 Avisos de lint pendientes

`npm run lint` da **0 errores y 24 avisos**: variables muertas y dependencias de `useEffect` incompletas heredadas. No rompen nada; se pueden ir limpiando poco a poco.

### 🟡 Nomenclatura

Los paquetes `com.gpsromp.Config` y `com.gpsromp.WebSocket` siguen con mayúscula inicial, contra la convención de Java. Arreglarlo es `git mv` de los directorios más un cambio de `package` en cada archivo: mecánico, pero toca todo y conviene hacerlo cuando no haya trabajo en curso.

Lo mismo con `Vehiculo.id_usuario` en snake_case, ligado al punto de la clave foránea.

### 🟡 Docker Compose no levanta las aplicaciones

`docker compose up` arranca solo las tres bases. Los `Dockerfile` del BackEnd y del Servidor-TCP existen pero no están declarados como servicios. Para desarrollo `node run.mjs` cubre el hueco; para despliegue habría que añadirlos.

---

## Lo que se hizo

### §1 Seguridad

| # | Tarea | Resultado |
|---|---|---|
| 1.1 | Secretos fuera del repositorio | `application.properties` sin ningún valor por defecto; tres `.env` ignorados por git más sus plantillas; el arranque **falla** si falta un secreto |
| 1.2 | Cerrar `POST /gps` | `FiltroApiKeyGps` con comparación en tiempo constante; el Servidor-TCP envía `X-API-Key`. Sin clave: **401** |
| 1.3 | JWT en el WebSocket | `InterceptorAutenticacionStomp`: valida el `CONNECT` y comprueba la propiedad del IMEI en el `SUBSCRIBE` |
| 1.4 | Audiencia en OAuth | Google contra `/tokeninfo` verificando `aud` y `email_verified`; GitHub contra `/applications/{id}/token` |
| 1.5 | Límite de intentos | Contadores en Redis, independientes por IP y por cuenta, con bloqueo temporal |
| 1.6 | Refresh tokens | Acceso de 15 min + refresco de 7 días revocable, con rotación; endpoints `/refrescar` y `/logout` |
| 1.7 | Bases con contraseña | Postgres, Mongo y Redis autenticados y publicados solo en `127.0.0.1` |

### §2 Frontend

| # | Tarea | Resultado |
|---|---|---|
| 2.1 | Dashboard con datos reales | Conectado a `/admin/resumen`, `/admin/usuarios` y `/admin/vehiculos`; buscador funcional, exportación CSV y activar/desactivar |
| 2.2 | Cliente HTTP único | `api.js` con `VITE_API_URL`, token automático, manejo del 401 y renovación transparente. Cero `localhost:8081` en el código |
| 2.3 | Linter | Dependencias instaladas, `eslint-plugin-react` añadido, scripts `lint` y `lint:fix`. De 91 problemas a **0 errores** |
| 2.4 | Doble conexión STOMP | `Mapa` recibe la posición por props; una sola conexión |
| 2.5 | Props muertas y botón inerte | Botón de GitHub cableado, `GitgubService` renombrado, comillas JSX escapadas |

### §3 Servidor-TCP / GT06

| # | Tarea | Resultado |
|---|---|---|
| 3.1 | Fragmentación TCP | `DecodificadorTramaGt06` (`ByteToMessageDecoder`) — **verificado byte a byte** |
| 3.2 | Dos bytes de más | Encuadre corregido — **verificado con dos tramas en un segmento** |
| 3.3 | CRC sin validar | Se comprueba y las tramas corruptas se descartan |
| 3.4 | ACK de heartbeat | Serial leído por posición desde el final de la trama |
| 3.5 | I/O bloqueante | `PublicadorBackend` en hilo aparte, con timeouts |
| 3.6 | Sin reintentos | Cola acotada con espera creciente (1s, 2s, 4s, 8s) |
| 3.7 | Hora del GPS | `registradoEn` como `Instant`; el backend ya no la pisa |
| 3.8 | Estado por conexión | Handler ya no es `@Sharable`; `GpsDataService` es un mapa por IMEI |
| 3.9 | Varios | `IdleStateHandler`, puerto configurable, `backend.base-url` en uso, `DataController` arreglado, SLF4J con el IMEI enmascarado |

### §4 Backend

Serialización de Redis corregida con `GenericJackson2JsonRedisSerializer` (y eliminado el método muerto que habría abierto un vector de RCE); WebSocket difunde **después** de persistir; `@Id` de Mongo correcto; `@EnableScheduling` muerto eliminado; OpenAPI en `/swagger-ui.html`; endpoint de historial GPS; 15 tests del protocolo GT06.

### §5 Repositorio

Spring Boot unificado en 3.4.3; `artifactId` y metadata corregidos; jjwt 0.11.5 → 0.12.6; `.gitignore` ya no ignora el wrapper de Maven; 13 `.class` destrackeados; `docker-compose` sin `version` obsoleto y con credenciales por variables; `run.mjs` multiplataforma que arranca los tres servicios y mata bien los hijos; README completo; CI en GitHub Actions con comprobación de secretos versionados.

---

## Verificación

| Prueba | Resultado |
|---|---|
| Seguridad end-to-end (API) | **19/19** |
| Bloque nuevo de seguridad | **11/11** |
| Protocolo GT06 (unitarios) | **15/15** |
| Dispositivo GT06 simulado | Fragmentación, dos tramas por segmento y CRC corrupto: correcto |
| WebSocket | Sin token y con token inválido rechazados; IMEI ajeno rechazado |
| Lint del frontend | 0 errores |
| Build del frontend | Correcto |
