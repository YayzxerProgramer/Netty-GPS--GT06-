# Diagnóstico técnico — Netty-GPS (GT06)

Fecha: 2026-08-27
Alcance: `BackEnd/` (Spring Boot 3.4.3), `Servidor-TCP/servidor-tpc/` (Spring Boot 4.0.2), `FrontEnd/` (React 18 + Vite 5), infraestructura.

---

## 🔴 Seguridad — crítico

### Cadena de ataque completa, sin credenciales previas

1. **Escalada de privilegios en el registro público.** `POST /usuario` es público (`SecurityConfig.java:46`) y acepta la entidad `Usuario` entera. `UsuarioService.java:57-59` solo fuerza `"USER"` si el rol viene vacío → un body con `{"rol":"ADMIN"}` **crea un administrador sin autenticarse**.
2. **Fuga de hashes de contraseña.** `GET /usuario` devuelve todos los usuarios con el hash BCrypt: `contrasena` no tiene `@JsonIgnore` (`Usuario.java:30`). Además `@Cacheable("usuarios")` mete esos hashes en Redis, que corre sin contraseña.
3. **Toma de cuenta.** `PATCH /usuario/contrasena/{id}` (`UsuarioController.java:108`) no pide la contraseña actual ni verifica propiedad → cualquier autenticado cambia la contraseña de cualquiera, incluido el admin real.
4. **WebSocket abierto.** `ws://host:8081/ws-gps` es `permitAll` y no valida JWT en el handshake → rastreo GPS en vivo de cualquier IMEI sin token.
5. **Ingesta abierta.** `POST /gps` es público → inyección de posiciones falsas para cualquier IMEI.

### Cero autorización por rol

La cadena termina en `.anyRequest().authenticated()` (`SecurityConfig.java:50`). No hay un solo `hasRole()`, `@PreAuthorize` ni `@EnableMethodSecurity` en todo el backend.

La infraestructura de roles sí está cableada de punta a punta — BD → `"ROLE_" + rol` en `ServicioDetallesUsuario.java:33` → claim `rol` en `JwtUtil.java:32` — y **no se consume en ninguna decisión de autorización**. Sin `@EnableMethodSecurity`, el primer `@PreAuthorize` que alguien escriba se ignora en silencio y el endpoint queda abierto.

### Secretos reales commiteados

En `application.properties`, que está versionado:

| Secreto | Línea |
|---|---|
| `github.client-secret=be5546...` | 50 |
| `jwt.secreto` | 38 |
| Password de Postgres | 12 |

Los `${VAR:default}` no protegen nada: sin la variable de entorno se usa el valor del repo. **Con el JWT secret público cualquiera forja tokens con `rol:ADMIN`.** El client secret de GitHub hay que rotarlo.

### OAuth sin validar audiencia

`googleClientId` se inyecta y nunca se usa. La validación va contra `/oauth2/v3/userinfo`, que acepta access tokens de **cualquier** aplicación de Google → *token substitution*.

---

## 🟠 Bugs funcionales

- **Caché Redis rompe tipos.** `RedisConfig` L45-46 serializa sin default typing → en cache-hit `ObtenerUsuarios()` devuelve una `List<LinkedHashMap>` disfrazada de `List<Usuario>` → `ClassCastException`. El método que lo arreglaría (`objectMapper()` L61-69) nunca se llama.
- **`@Cacheable` sobre `Optional` + `disableCachingNullValues()`** → `GET /vehiculo/{id}` inexistente devuelve **500 en vez de 404**.
- **`PUT /vehiculo/{id}` borra datos.** Sobrescribe los 6 campos sin null-check → un PUT parcial pone `imei`, `activo` e `id_usuario` a null, desvinculando el vehículo del dueño y del GPS. `PUT /usuario/{id}` hace lo contrario (patch con `if != null`): dos semánticas opuestas para el mismo verbo.
- **Usuario desactivado → HTTP 500.** `JwtFilter.java:31` no captura `UsernameNotFoundException`. Un admin desactiva a alguien y todas sus peticiones revientan con 500 en vez de 401.
- **Unicidad sin respaldo en BD.** `usuario` y `correo` no tienen `@Column(unique=true)`. Los `existsBy*` son check-then-act → condición de carrera → dos usuarios iguales → `findByUsuario` lanza excepción y **el login queda roto para ambos**.
- **`@OneToMany(mappedBy="id_usuario")`** apunta a un `UUID` plano, no a un `@ManyToOne`. Sin FK, sin navegación inversa, `cascade=ALL` colgando del lado inverso.
- **Servidor-TCP:** los paquetes fragmentados por TCP se pierden (no hay `ByteToMessageDecoder`); se consumen 2 bytes de más por trama → se pierde el segundo paquete de cada segmento; el CRC entrante nunca se valida; el ACK de heartbeat manda un serial inventado; `restTemplate.postForEntity` bloquea el event loop de Netty sin timeouts.
- **Hora del GPS descartada.** El TCP manda `timestamp` como string libre, `GPSData` del backend no tiene ese campo → Jackson lo tira y `GPSDataService` L38 guarda `Instant.now()`.
- **WebSocket emite antes de persistir** (L42 vs L44) → si Mongo falla, el cliente ya pintó una posición que no existe.

---

## 🟡 Deuda

### Backend

Cero DTOs (entidades y `Map<String,String>` crudos). Cero `@Valid` pese a tener la dependencia. Cero `@ControllerAdvice` → los `catch (RuntimeException)` convierten cualquier fallo en **404 mentiroso**. Sin paginación en `GET /usuario` ni `GET /vehiculo`. N+1 garantizado por `open-in-view` + colección LAZY serializada. `System.out.println` para eventos de seguridad.

Código muerto: enum `Rol`, enum `tipo`, `UsuarioService.login()`, `JwtUtil.extraerRol()`, `WebConfig.restTemplate()`, el query de historial GPS.

Tres capas de CORS contradictorias. Nomenclatura mezclada: `ObtenerUsuarios` con mayúscula, paquete `Config` con mayúscula, `id_usuario` en snake_case con columna `usuario_id`.

### Repo

Spring Boot **3.4.3 vs 4.0.2** entre módulos que se hablan por HTTP. `artifactId` sigue siendo `demo`. jjwt 0.11.5 (2021, API deprecada). El `.gitignore` ignora `mvnw` y `.mvn/` — justo lo que debe versionarse — y hay 13 `.class` de `target/` ya trackeados que ensucian cada `git status`. Sin README raíz, sin CI, sin OpenAPI, sin `.env.example`. Tests: dos `contextLoads()` vacíos, cero en frontend. ESLint configurado pero **sus dependencias no están instaladas** → linter muerto.

### Frontend

Ninguna ruta protegida: `/panel-control` renderiza sin token. El `rol` que devuelve el login se descarta. 14 `fetch` hardcodean `localhost:8081`, headers `Authorization` duplicados a mano 11 veces, sin manejo de 401, sin logout por expiración. `Dashboard.jsx` es un panel admin completo **visualmente** (269 líneas, datos falsos) pero **huérfano**: ninguna ruta lo apunta. Doble conexión STOMP al mismo topic. `CambiarContrasena.jsx:178` navega a `/panel-usuario`, ruta inexistente → pantalla en blanco.

---

## Lo que se va a hacer

Tarea asignada: **verificar y crear endpoints, proteger rutas y crear la lógica de backend del panel administrativo.**

### Decisiones tomadas

| Decisión | Elección |
|---|---|
| **Alcance** | Panel admin + las correcciones de seguridad que lo bloquean. Fuera: GT06/Servidor-TCP, serialización de Redis, frontend. |
| **Primer admin** | `CommandLineRunner` que lee `ADMIN_USUARIO` / `ADMIN_CONTRASENA` de variables de entorno y crea o promueve ese usuario si no existe ningún ADMIN. |
| **Rol** | Migrar a `@Enumerated(EnumType.STRING)` con el enum `Rol {ADMIN, USER, VIEWER}` ya declarado en `Usuario.java:53`. Las filas actuales guardan `"USER"`, que coincide con el nombre del enum → sin migración de datos. |

Razón del alcance: sin cerrar la escalada de privilegios ni la fuga de hashes, el panel no significa nada — hoy cualquier `USER` ya puede borrar administradores.

### Pasos previstos — qué hago, por qué y qué mejora

#### 1. Modelo de roles tipado

**Qué hago.** Extraigo el enum `Rol {ADMIN, USER, VIEWER}` de dentro de `Usuario` a su propia clase `com.gpsromp.usuario.model.Rol`, y cambio el campo `private String rol` por `@Enumerated(EnumType.STRING) private Rol rol`. En cascada toco `ServicioDetallesUsuario:33` (`"ROLE_" + rol.name()`), `JwtUtil.generarToken`, y los tres flujos de login (`/login`, `/google`, `/github`).

**Por qué.** Hoy `rol` es un `String` libre. Nada impide guardar `"admin"` en minúscula, `"SUPERADMIN"` o una cadena vacía. Como la authority se construye concatenando (`"ROLE_" + rol`), un `"admin"` produce `ROLE_admin` y **`hasRole("ADMIN")` falla en silencio**: el usuario simplemente pierde el acceso sin ningún error que lo explique. Es exactamente el tipo de fallo que aparece en producción y no en desarrollo.

**Mejora.** El compilador pasa a garantizar que solo existen tres roles. Se acaban los errores de tipeo y de mayúsculas, y el enum que llevaba meses declarado sin usarse por fin sirve para algo.

#### 2. Habilitar autorización por método

**Qué hago.** Añado `@EnableMethodSecurity` a `SecurityConfig` y verifico con una prueba real que un `@PreAuthorize` deniega de verdad.

**Por qué.** Es el paso que hace que todo lo demás exista. Sin esa anotación, **Spring ignora los `@PreAuthorize` sin emitir ni un warning**: el código parece protegido, se lee como protegido, y está abierto. Es el peor modo de fallo posible porque es invisible.

**Mejora.** Deja de ser posible creer que algo está protegido cuando no lo está. La verificación es explícita: un `USER` llamando a un endpoint de admin debe recibir 403, y si recibe 200 el paso no está hecho.

#### 3. DTOs de entrada y salida

**Qué hago.** Creo DTOs: respuesta de usuario sin `contrasena`, petición de registro con lista blanca de campos, petición de cambio de rol, resumen de vehículo y envoltorio de respuesta paginada. Mapeo manual entidad↔DTO, sin MapStruct.

**Por qué.** Exponer la entidad JPA directamente tiene dos consecuencias graves. A la salida, **el hash BCrypt viaja al navegador** en cada carga de página y acaba cacheado en Redis sin contraseña. A la entrada, el cliente controla *todos* los campos de la entidad, que es la raíz del punto 4. Descarto MapStruct porque añade procesamiento de anotaciones a un proyecto que ya tuvo problemas con Lombok y el JDK; el mapeo a mano es más código pero cero riesgo de build.

**Mejora.** El contrato de la API deja de ser un accidente del modelo de datos. Se puede cambiar el esquema de la BD sin romper el frontend, y ninguna respuesta puede filtrar un campo sensible por olvido.

#### 4. Cerrar la escalada de privilegios del registro

**Qué hago.** El registro público deja de aceptar `rol`, `id`, `activo` y `vehiculos`. El DTO de registro solo declara los campos que un usuario anónimo puede legítimamente enviar; el rol se asigna en el servidor, siempre `USER`.

**Por qué.** Es el agujero número uno del proyecto: un `curl` de una línea contra un endpoint público crea un administrador. Cualquier control de acceso que construya encima es decorativo mientras esto siga abierto.

**Mejora.** El privilegio pasa a ser una decisión del servidor, no un campo del formulario. `Registro.jsx` seguirá mandando `rol: "USER"` en el body y **no se rompe**: el campo simplemente deja de existir en el DTO y Jackson lo descarta.

#### 5. Endpoints del panel administrativo

**Qué hago.** Listado de usuarios paginado, filtrado (por `rol`, por `activo`, búsqueda por nombre/usuario/correo) y ordenado; detalle; crear usuario con rol; actualizar; cambiar rol; activar/desactivar; eliminar; vehículos de un usuario; asignar y desasignar vehículo; listado de vehículos; y métricas de resumen para las stat cards. Añado `findByIdUsuario(UUID)` y `existsByImei(String)` a `VehiculoRepository`.

**Por qué.** Es la tarea asignada. Además, tres cosas que el panel necesita **hoy no existen**: no se puede cambiar el rol de nadie (`actualizarUsuario` ignora `rol` deliberadamente), no se puede listar sin traerse la tabla entera, y no hay forma de consultar los vehículos de un usuario sin cargar el `Usuario` completo y navegar una colección LAZY colgada de un `mappedBy` que apunta a un `UUID` plano.

**Mejora.** La paginación evita que el panel se caiga cuando haya miles de usuarios, y de paso corta el N+1 que hoy dispara una consulta extra por cada usuario listado. `findByIdUsuario` elimina la dependencia de la relación rota. `existsByImei` convierte el 500 por IMEI duplicado en un 400 con mensaje.

#### 6. Reglas de acceso y propiedad

**Qué hago.** Clasifico cada endpoint en tres niveles: público, "el propio usuario o un ADMIN", y solo ADMIN. La comprobación de propiedad va en un bean de seguridad invocado desde SpEL, del estilo `@PreAuthorize("hasRole('ADMIN') or @seguridad.esPropietario(#id, authentication)")`. Casos límite: un admin no puede degradarse ni borrarse a sí mismo si es el último ADMIN; cambiar la contraseña propia exige aportar la actual; cambiar la de otro es solo ADMIN.

**Por qué.** Hoy hay IDOR generalizado: cualquier cuenta autenticada lee, edita y borra los datos de cualquier otra, y cambia contraseñas ajenas sin conocer la anterior. Y sin la regla del último ADMIN, un solo clic desafortunado deja el sistema sin ningún administrador y sin forma de recuperarlo por la interfaz.

**Mejora.** El acceso pasa a depender de quién eres, no solo de que tengas un token válido. Las reglas quedan declaradas junto al endpoint, donde se leen, en vez de repartidas en `if` dentro de los servicios.

#### 7. Manejo de errores coherente

**Qué hago.** Un `@ControllerAdvice` global con jerarquía de excepciones propia (`RecursoNoEncontradoException`, `RecursoDuplicadoException`, …) y un formato de error único. Incluye `AccessDeniedException` → 403, `AuthenticationException` → 401 y el `AuthenticationEntryPoint` que hoy no existe.

**Por qué.** El patrón actual, `catch (RuntimeException e) { return notFound(); }`, **convierte cualquier fallo en un 404 mentiroso**: un correo duplicado, un fallo de conexión a Postgres y un id inexistente devuelven los tres lo mismo. Depurar eso es imposible. Y como no hay `AuthenticationEntryPoint`, un usuario sin token recibe 403 en vez de 401, así que el frontend no puede distinguir "inicia sesión" de "no tienes permiso".

**Mejora.** Cada fallo devuelve el código que le corresponde con un cuerpo predecible. El frontend puede por fin reaccionar a un 401 cerrando sesión y a un 403 mostrando un mensaje, en vez de tragarse todo como si el recurso no existiera.

#### 8. Validación de entrada

**Qué hago.** `@Valid` en los DTOs con `@NotBlank`, `@Email`, `@Size` y `@Pattern` donde corresponda.

**Por qué.** La dependencia `spring-boot-starter-validation` lleva en el `pom.xml` desde el principio y no se usa en ni un solo sitio. Hoy `POST /usuario` con `contrasena: null` provoca un NPE dentro de `passwordEncoder.encode(null)` y devuelve un 500 con stacktrace; una placa de más de 6 caracteres revienta contra la constraint de la BD.

**Mejora.** Los datos malos se rechazan en el borde con un 400 y un mensaje que dice qué campo falla, en vez de propagarse hasta la capa de persistencia y salir como error interno.

#### 9. Seeder del primer administrador

**Qué hago.** Un `CommandLineRunner` que, al arrancar, comprueba si existe algún ADMIN. Si no hay ninguno, lee `ADMIN_USUARIO` y `ADMIN_CONTRASENA` del entorno y crea o promueve ese usuario. Si las variables no están puestas, no crea nada y deja un aviso en el log: **no revienta el arranque**.

**Por qué.** El paso 4 cierra la única vía que existía para crear un administrador. Sin un mecanismo de arranque, el sistema queda sin acceso administrativo y sin forma de recuperarlo salvo tocando la BD a mano.

**Mejora.** El bootstrap queda documentado en el repo y es reproducible en cualquier máquina y en Docker, sin `UPDATE` manuales que nadie recuerda y sin dejar un endpoint público de bootstrap como superficie de ataque permanente.

#### 10. Correcciones de seguridad incluidas en el alcance

**Qué hago.** Tres arreglos puntuales: el hash de contraseña fuera de todas las respuestas (consecuencia del paso 3), `@Column(unique=true)` en `usuario` y `correo`, y `JwtFilter` capturando `UsernameNotFoundException` para devolver 401.

**Por qué.** La unicidad hoy solo la defienden unos `existsBy*` en el controlador, que son *check-then-act*: dos peticiones simultáneas crean dos usuarios con el mismo `usuario`, y a partir de ahí `findByUsuario` lanza excepción y **el login queda roto para ambos, de forma permanente**. Y el fallo del `JwtFilter` se dispara justo con la función que el panel va a estrenar: en cuanto un admin desactive a alguien, todas las peticiones de esa persona devolverán 500 en vez de 401.

**Mejora.** La integridad la garantiza la base de datos, no una comprobación con ventana de carrera. Y desactivar un usuario pasa a hacer lo que promete: cerrarle el acceso limpiamente.

> **Antes de aplicar `unique=true`:** hay que comprobar si ya existen duplicados en `Usuarios`. Con `ddl-auto=update`, si los hay, Hibernate falla al crear el índice y **la aplicación no arranca**.

### Repositorios que faltan

`VehiculoRepository` necesita `findByIdUsuario(UUID)` y `existsByImei(String)`. El primero evita depender de la colección LAZY con el `mappedBy` roto; el segundo evita el 500 por IMEI duplicado en `POST /vehiculo`.

### Notas de entorno

No hay `mvn` en el PATH: se usa `./mvnw`. Backend en **8081**, Postgres en **5435** (no 5432, lo secuestra el servicio nativo de Windows), Mongo 27017, Redis 6379, los tres en Docker.

---

## Estado: implementado y verificado

Los 10 pasos están hechos. **19 de 19 comprobaciones end-to-end en verde** contra el stack real.

### Cómo arrancar

```bash
docker compose up -d
cd BackEnd
ADMIN_USUARIO=admin ADMIN_CONTRASENA=Admin12345 ./mvnw spring-boot:run
```

En PowerShell:

```powershell
$env:ADMIN_USUARIO="admin"; $env:ADMIN_CONTRASENA="Admin12345"; .\mvnw spring-boot:run
```

Si no se definen esas variables el arranque no falla: el log avisa de que no hay administrador y el panel queda inaccesible hasta que se definan.

### Migración de base de datos — obligatoria

`ddl-auto=update` **no altera columnas que ya existen**. Se verificó contra la BD real: tras arrancar con `@Column(unique=true, nullable=false)` puesto, `usuario` y `correo` seguían siendo nullable y sin UNIQUE. Las anotaciones solas no habrían arreglado nada.

El DDL explícito está en `BackEnd/src/main/resources/db/migracion-01-seguridad.sql` y ya se aplicó en local:

```bash
docker exec -i rompgps-postgres psql -U rompgps -d rompgps_users \
  < BackEnd/src/main/resources/db/migracion-01-seguridad.sql
```

Es idempotente. **Antes de ejecutarlo en un entorno con datos**, comprobar duplicados con las consultas que trae comentadas en la cabecera: si existen, las sentencias fallan y la migración no se aplica.

### Endpoints nuevos del panel

Todos bajo `/admin/**`, protegidos por `@PreAuthorize("hasRole('ADMIN')")` y además por ruta en `SecurityConfig`.

| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/admin/resumen` | Métricas de las stat cards (solo COUNT) |
| GET | `/admin/usuarios` | Listado paginado + búsqueda + filtro por `rol` y `activo` + orden |
| GET | `/admin/usuarios/{id}` | Detalle |
| POST | `/admin/usuarios` | Alta con rol |
| PUT | `/admin/usuarios/{id}` | Actualización |
| PATCH | `/admin/usuarios/{id}/rol` | **Cambio de rol — no existía en la API** |
| PATCH | `/admin/usuarios/{id}/estado` | Activar / desactivar |
| PATCH | `/admin/usuarios/{id}/contrasena` | Reseteo sin pedir la actual |
| DELETE | `/admin/usuarios/{id}` | Eliminar |
| GET | `/admin/usuarios/{id}/vehiculos` | Vehículos del usuario |
| GET | `/admin/vehiculos` | Listado paginado + filtros |
| GET | `/admin/vehiculos/{id}` | Detalle |
| PUT | `/admin/vehiculos/{id}/usuario` | Asignar / desasignar propietario |
| PATCH | `/admin/vehiculos/{id}/estado` | Activar / desactivar |
| DELETE | `/admin/vehiculos/{id}` | Eliminar |

Parámetros del listado: `busqueda`, `rol`, `activo`, `pagina`, `tamano` (tope 100), `ordenarPor` (lista blanca), `direccion`.

### Resultado de la verificación

| Comprobación | Antes | Ahora |
|---|---|---|
| `USER` contra `/admin/usuarios` | — | **403** |
| `ADMIN` contra `/admin/usuarios` | — | 200 |
| Registro público con `"rol":"ADMIN"` | creaba un admin | devuelve **`"rol":"USER"`** |
| `contrasena` en las respuestas | hash BCrypt visible | **ausente** |
| `USER` lee / borra al admin | 200 | **403** |
| Consultar GPS de un IMEI ajeno | 200 | **403** |
| Admin se degrada / se borra a sí mismo | permitido | **409** |
| Petición sin token | 403 | **401** |
| Recurso inexistente | 404 falso o 500 | **404 real** |
| Rol inválido `"SUPERADMIN"` | 500 | **400** con los valores válidos |
| Registro con datos malos | 500 (NPE) | **400** campo a campo |
| Usuario o correo duplicado | 500 | **409** |
| Token de cuenta desactivada | **500** | **401** |
| `PUT /vehiculo` parcial | borraba `imei` y `id_usuario` | los conserva |
| IMEI duplicado al crear vehículo | 500 | **409** |

### Cambio en el frontend

`CambiarContrasena.jsx` enviaba solo `{ nuevaContrasena }` y el formulario ni siquiera pedía la contraseña actual, así que el endpoint endurecido lo habría dejado inservible. Se añadió el campo "Contraseña actual", se envía `contrasenaActual`, se muestra el mensaje de error real del backend, y se corrigieron de paso dos defectos del mismo archivo: la redirección a `/panel-usuario` (ruta inexistente, dejaba la pantalla en blanco) ahora va a `/configuracion`, y se eliminó el texto suelto "Cambiar contraseña" que se renderizaba fuera del botón.

`Registro.jsx` y `PerfilUsuario.jsx` siguen enviando `rol` y `activo` en sus cuerpos y **no se rompen**: los DTOs no declaran esos campos y Jackson los descarta.

### Fuera de alcance — sigue pendiente

1. **Rotar el client secret de GitHub.** Está en el historial de git; quitarlo del archivo no lo borra.
2. **`POST /gps` sigue público.** Cerrarlo exige que el Servidor-TCP se autentique, y ese módulo queda fuera de esta tarea.
3. **El WebSocket sigue abierto.** Validar el JWT en el handshake obliga a tocar el cliente STOMP del frontend.
4. **OAuth sin validar audiencia** (Google y GitHub): hay que verificar el ID token contra el `client-id`.
5. **Serialización de Redis.** Se retiraron los `@Cacheable` que provocaban `ClassCastException` y 500 en vez de 404, pero la configuración sigue sin default typing.
6. **Bugs del Servidor-TCP / GT06**: framing, CRC sin validar, ACK de heartbeat, POST bloqueando el event loop.
