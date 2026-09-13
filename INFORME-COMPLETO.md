# Informe completo de la intervención — Proyecto RompGPS

Documento de referencia con todo lo realizado sobre el proyecto: qué se encontró, qué se cambió, por qué se cambió y cómo se verificó. Incluye el inventario íntegro de archivos creados, modificados y eliminados.

**Resumen en una línea:** se auditó un sistema de rastreo GPS, se encontraron cinco vulnerabilidades críticas y varios bugs que hacían perder datos, y se corrigieron los cincuenta y tantos problemas detectados repartidos en tres módulos.

**Cifras:** 53 archivos nuevos, 49 modificados, 2 eliminados. 45 pruebas automatizadas y manuales, todas en verde.

---

# PARTE 1 — Qué es el proyecto

RompGPS es un sistema de rastreo vehicular en tiempo real. Un dispositivo GPS instalado en un vehículo envía su posición, y esa posición acaba dibujándose en un mapa dentro de una aplicación web.

El recorrido de un dato es este:

```
Dispositivo GT06  ──TCP puerto 9000──>  Servidor-TCP
                                             │
                                        HTTP │
                                             ▼
                                          BackEnd  ──WebSocket──>  FrontEnd
                                             │
                            PostgreSQL · MongoDB · Redis
```

El proyecto tiene tres módulos independientes:

**Servidor-TCP.** Escucha en el puerto 9000. Los dispositivos GPS no hablan HTTP: hablan un protocolo binario propio llamado **GT06**, en el que cada mensaje es una secuencia de bytes con una estructura fija. Este módulo traduce esos bytes a datos comprensibles y los reenvía al backend. Está construido con Netty, una biblioteca de red de bajo nivel.

**BackEnd.** La API REST. Gestiona usuarios, vehículos y posiciones. Autentica, autoriza, persiste y difunde en tiempo real. Construido con Spring Boot.

**FrontEnd.** La aplicación web en React: pantalla de login, panel de control con el mapa en vivo, y un panel administrativo.

Y tres bases de datos, cada una para lo que hace bien:

- **PostgreSQL** — usuarios y vehículos, que son datos relacionales.
- **MongoDB** — el histórico de posiciones, que son millones de registros con la misma forma.
- **Redis** — caché de la última posición, sesiones y contadores.

---

# PARTE 2 — El punto de partida

Antes de tocar nada se auditó el proyecto completo. Lo que se encontró se agrupa en tres niveles de gravedad.

## 2.1 Las cinco vulnerabilidades críticas

Lo más grave no eran fallos aislados, sino que **encadenados permitían tomar el control del sistema entero sin tener ninguna credencial previa**.

### Vulnerabilidad 1 — Cualquiera podía crearse como administrador

El endpoint de registro (`POST /usuario`) era público, lo cual es correcto: la gente necesita poder crearse una cuenta. El problema es que aceptaba el objeto `Usuario` completo tal como llega del cliente, incluido el campo `rol`.

El código solo forzaba el rol a `"USER"` **si venía vacío**. Si el cliente enviaba un rol, se respetaba.

Consecuencia: enviar `{"rol": "ADMIN"}` en el formulario de registro creaba un administrador. Sin autenticarse. Con una sola petición.

### Vulnerabilidad 2 — La API devolvía las contraseñas

La entidad `Usuario` se serializaba directamente en las respuestas, y esa entidad incluye el campo `contrasena` con el hash BCrypt.

`GET /usuario` devolvía **todos los usuarios con sus hashes**. Y como ese listado estaba cacheado, los hashes acababan también en Redis, que corría sin contraseña.

Un hash BCrypt no es una contraseña en claro, pero es material para ataques de diccionario offline. No debe salir nunca del servidor.

### Vulnerabilidad 3 — Se podía tomar cualquier cuenta

El endpoint de cambio de contraseña recibía un id de usuario y una contraseña nueva. **No pedía la contraseña actual y no verificaba que el id fuera del usuario autenticado.**

Combinado con las dos anteriores: te registras, listas todos los usuarios para ver sus id, y cambias la contraseña del administrador real.

### Vulnerabilidad 4 — Rastreo GPS sin autenticación

El canal WebSocket que difunde las posiciones en vivo estaba completamente abierto. Cualquiera podía conectarse a `ws://servidor:8081/ws-gps`, suscribirse al identificador de un dispositivo y **ver en tiempo real dónde está ese vehículo**. Sin token, sin identificarse, desde cualquier origen.

Y los identificadores de dispositivo se podían listar con una cuenta gratuita.

### Vulnerabilidad 5 — Inyección de posiciones falsas

El endpoint que recibe las posiciones (`POST /gps`) era público. Cualquiera podía enviar coordenadas inventadas para cualquier dispositivo, y esas coordenadas **se guardaban y se retransmitían a los clientes legítimos como si fueran reales**.

### El agujero transversal: cero autorización por rol

Las cinco anteriores tenían una causa común. La configuración de seguridad terminaba en una única regla: *"cualquier petición requiere estar autenticado"*. Nada más.

No había ni una sola comprobación de rol en todo el backend. Un usuario normal podía llamar a cualquier endpoint que llamara un administrador.

Lo llamativo: **la infraestructura de roles existía y funcionaba**. La base de datos guardaba el rol, el sistema lo convertía en un permiso de Spring Security, el token lo incluía. Todo el cableado estaba puesto. Simplemente **nadie lo consultaba para tomar una decisión**.

### El agravante: los secretos estaban publicados

El archivo de configuración estaba versionado en git y contenía valores reales:

- El **client secret de GitHub**, que es la credencial que identifica a la aplicación ante GitHub.
- El **secreto del JWT**, que es la clave con la que se firman los tokens de sesión.
- La **contraseña de PostgreSQL**.

Se usaba el patrón `${VARIABLE:valor-por-defecto}`, que parece seguro pero no lo es: si la variable de entorno no está definida, **se usa el valor escrito en el archivo**. En un despliegue donde alguien olvide configurar el entorno, la aplicación arranca con el secreto público.

Con el secreto del JWT publicado, cualquiera podía **fabricar un token de administrador válido** sin necesidad de ninguna de las vulnerabilidades anteriores.

## 2.2 Los bugs que hacían perder datos

Menos llamativos, pero con impacto operativo directo.

### El más grave: se perdían posiciones GPS

Tres fallos distintos en el mismo punto, la decodificación del protocolo GT06.

**Fragmentación TCP.** TCP no garantiza que un mensaje llegue de una pieza. Un mensaje de 30 bytes puede llegar como 12 bytes y luego 18. El código asumía que llegaba entero: si detectaba que faltaban bytes, dejaba de procesar y esperaba... pero Netty ya había liberado el buffer. **Todo mensaje partido entre dos segmentos TCP se perdía completo.**

**Dos bytes de más por mensaje.** En GT06 el byte de longitud incluye el checksum. El código lo contaba aparte y consumía dos bytes extra que, en realidad, eran el inicio del mensaje siguiente. Con dos mensajes en el mismo paquete de red, **el segundo se perdía**.

**Checksum sin verificar.** Cada mensaje GT06 trae un CRC para detectar corrupción. El código lo leía y lo descartaba. **Cualquier mensaje corrupto se procesaba como bueno**, guardando coordenadas basura.

### La hora del GPS se descartaba

El dispositivo envía cuándo tomó la posición. El servidor TCP la construía como texto libre (`"Año: 2024 Mes: 5..."`), el backend no tenía ese campo, y la biblioteca de serialización lo descartaba en silencio. El backend guardaba entonces la hora de recepción.

Consecuencia: **el histórico no reflejaba cuándo estuvo el vehículo en cada sitio, sino cuándo llegó el dato al servidor.** Con reintentos o con el buffer del propio dispositivo, los recorridos quedaban desordenados.

### Un usuario desactivado provocaba error 500

Al desactivar una cuenta, el sistema lanzaba una excepción que nadie capturaba. Resultado: **todas las peticiones de esa persona devolvían error 500 del servidor** en lugar de un 401 de "no autorizado".

Es exactamente el escenario que estrena un panel administrativo al desactivar cuentas.

### Una actualización parcial borraba datos

Al actualizar un vehículo, el código sobrescribía los seis campos sin comprobar si venían informados. Enviar solo el modelo ponía a nulo el identificador GPS y el propietario: **el vehículo quedaba huérfano y desvinculado de su dispositivo**.

Curiosamente, la actualización de usuario hacía justo lo contrario. Dos comportamientos opuestos para la misma operación.

### La unicidad no estaba garantizada

Los campos de nombre de usuario y correo no tenían restricción de unicidad en la base de datos. La única defensa era una comprobación previa en código, que tiene una ventana de carrera: dos peticiones simultáneas pasan ambas la comprobación.

Si eso ocurría, se creaban dos usuarios con el mismo nombre, y a partir de ahí **el login quedaba roto permanentemente para los dos**.

### La caché rompía los tipos

La configuración de Redis serializaba sin guardar información de tipo. Al recuperar de caché, una lista de usuarios volvía como una lista de mapas genéricos disfrazada de lista de usuarios, y el primer acceso tipado lanzaba una excepción.

Lo irónico: existía un método en el mismo archivo que lo habría arreglado, pero **nunca se llamaba desde ningún sitio**.

### Errores que mentían

El patrón usado en los controladores era capturar cualquier excepción y devolver "404 no encontrado". Un correo duplicado, una base de datos caída y un id inexistente devolvían **exactamente lo mismo**: un 404 sin cuerpo. Depurar era imposible.

## 2.3 La deuda técnica

- Cero DTOs: la API exponía las entidades de base de datos directamente.
- Cero validación de entrada, pese a tener la biblioteca incluida.
- Sin paginación: los listados traían la tabla entera.
- El panel administrativo existía **solo como maqueta visual**: 269 líneas con datos inventados y sin ninguna ruta que lo apuntara.
- Ninguna ruta del frontend estaba protegida.
- 14 llamadas con la dirección del servidor escrita a mano en 9 archivos.
- El linter estaba configurado pero **sus dependencias no estaban instaladas**: no se podía ejecutar.
- Dos versiones mayores distintas de Spring Boot entre módulos que se comunican.
- El `.gitignore` ignoraba el wrapper de Maven, que es justo lo que debe versionarse.
- Sin README, sin integración continua, sin documentación de la API.
- Cobertura de pruebas: cero.

---

# PARTE 3 — Las decisiones de diseño

Antes de implementar se tomaron tres decisiones que condicionan todo lo demás.

## Decisión 1 — Alcance

**Se eligió:** el panel administrativo más las correcciones de seguridad que lo bloquean.

**Por qué:** construir un panel de administración sobre un sistema donde cualquier usuario ya puede borrar administradores no aporta nada. El panel sería una interfaz bonita sobre un sistema sin control de acceso.

Posteriormente el alcance se amplió a la totalidad del backlog.

## Decisión 2 — Cómo crear el primer administrador

**El problema:** al cerrar la escalada de privilegios, desaparece la única forma que existía de crear un administrador. El sistema se quedaría sin acceso administrativo.

**Se eligió:** un componente que se ejecuta al arrancar, lee unas variables de entorno y crea o promueve ese usuario **solo si no existe ningún administrador**.

**Por qué frente a las alternativas:**

- *Ejecutar SQL a mano*: no queda documentado y hay que repetirlo en cada entorno.
- *Un endpoint público de arranque*: cómodo, pero deja superficie de ataque permanente.

El sembrador es reproducible, funciona igual en cualquier máquina, y no añade ningún endpoint.

## Decisión 3 — El rol como tipo cerrado

**El problema:** el rol era una cadena de texto libre. Nada impedía guardar `"admin"` en minúscula o `"SUPERADMIN"`.

Esto importa porque el permiso se construye concatenando: `"ROLE_" + rol`. Un `"admin"` produce `ROLE_admin`, y la comprobación `hasRole("ADMIN")` **falla en silencio**. El usuario pierde el acceso sin ningún error que lo explique. Es el tipo de fallo que aparece en producción y no en desarrollo.

**Se eligió:** convertirlo en un tipo enumerado persistido como texto.

Ventaja adicional: los valores existentes en la base ya eran `"USER"`, que coincide con el nombre de la constante, así que **no hizo falta migrar datos**.

---

# PARTE 4 — Lo que se hizo, bloque por bloque

## Bloque A — Roles y autorización

### A.1 El tipo enumerado de rol

**Archivo nuevo:** `usuario/model/Rol.java`

Se extrajo el enumerado a su propia clase con tres valores: `ADMIN`, `USER`, `VIEWER`. Existía ya declarado dentro de la entidad, pero como código muerto que nadie usaba.

El campo de la entidad pasó de texto libre a este tipo. En cascada hubo que ajustar el punto donde se construye el permiso de seguridad, el generador de tokens y los tres flujos de login.

**Qué mejora:** el compilador garantiza que solo existen tres roles. Se acabaron los errores de tipeo y de mayúsculas.

### A.2 Activar la seguridad por método — el cambio central

**Archivo modificado:** `Config/SecurityConfig.java`

Se añadió la anotación `@EnableMethodSecurity`.

**Por qué es el cambio más importante de todos:** sin esa anotación, **Spring ignora las reglas de autorización sin emitir ningún aviso**. El código se lee como protegido, pasa las revisiones, y está completamente abierto.

Es el peor modo de fallo posible porque es invisible. Todas las reglas por rol del proyecto dependen de esta línea.

**Cómo se verifica:** un usuario normal llamando a un endpoint de administrador debe recibir "403 prohibido". Si recibe "200 correcto", la anotación no está surtiendo efecto.

### A.3 Las comprobaciones de propiedad

**Archivo nuevo:** `Config/SeguridadService.java`

Un componente con métodos que responden preguntas del tipo *"¿este identificador corresponde al usuario que está llamando?"*, *"¿este vehículo es suyo?"*, *"¿este dispositivo GPS es suyo?"*.

Se invocan desde las anotaciones de autorización, de forma que la regla se lee junto al endpoint:

```
"hasRole('ADMIN') or @seguridad.esMiUsuario(#id, authentication)"
```

Que se lee: *o eres administrador, o son tus propios datos*.

**Detalle de diseño:** todos los métodos devuelven "no" ante datos ausentes o inconsistentes. En una decisión de autorización, **"no lo sé" tiene que significar "no"**.

**Qué resuelve:** el acceso pasa a depender de quién eres, no solo de tener un token válido.

## Bloque B — Los DTOs y el cierre de la escalada de privilegios

### B.1 Objetos de transferencia

**Archivos nuevos:** 15 en total, entre `usuario/dto/`, `vehiculo/dto/`, `admin/dto/` y `common/dto/`.

Un DTO es un objeto que define exactamente qué campos entran y salen de la API, separado de la entidad de base de datos.

**Se eligió mapeo manual** en lugar de una biblioteca generadora. Razón concreta: el proyecto ya había tenido problemas de compilación entre Lombok y la versión del JDK. Añadir más procesamiento de anotaciones era añadir riesgo. El mapeo a mano es más verboso pero no puede romper la compilación.

**Qué resuelve:**

- *A la salida:* el DTO de respuesta **no declara el campo de contraseña**, así que el hash no puede filtrarse por ninguna vía.
- *A la entrada:* el DTO de registro **no declara el campo rol**. Aunque el cliente lo envíe, se descarta. Este es el arreglo de la vulnerabilidad número uno.

**Detalle de compatibilidad:** el formulario de registro del frontend seguía enviando `rol: "USER"`. No se rompió: el campo simplemente deja de existir en el contrato y se ignora.

### B.2 El envoltorio de paginación

**Archivo nuevo:** `common/dto/PaginaResponse.java`

Se creó en lugar de devolver el objeto de página de Spring directamente, porque **la serialización de ese objeto no tiene contrato garantizado entre versiones** del framework.

## Bloque C — El panel administrativo

### C.1 El controlador

**Archivos nuevos:** `admin/controller/AdminController.java` y `admin/dto/ResumenAdminResponse.java`

15 endpoints nuevos bajo la ruta `/admin`.

**Se eligió un controlador separado** en lugar de anotar los existentes, por dos razones:

1. El frontend ya consume las rutas antiguas y no debía romperse.
2. Aislar la superficie de administración permite protegerla **también a nivel de ruta**. Si alguien añade un método y olvida la anotación, la cadena de filtros lo sigue cubriendo. Es defensa en profundidad.

Los endpoints cubren: listado paginado con búsqueda y filtros, detalle, alta con rol, actualización, cambio de rol, activar/desactivar, eliminar, vehículos por usuario, asignación de vehículos y métricas de resumen.

### C.2 El cambio de rol, que no existía

Merece mención aparte: **la operación de cambiar el rol de alguien no existía en la API**. El método de actualización copiaba siete campos e ignoraba el rol deliberadamente. No había forma de promover ni degradar a nadie.

### C.3 Las reglas de protección

Tres reglas que evitan dejar el sistema inutilizable:

- Un administrador **no puede quitarse a sí mismo** el rol de administrador.
- **No puede desactivarse ni borrarse** a sí mismo.
- **No se puede degradar al último administrador** que queda.

Sin la última, un solo clic desafortunado deja el sistema sin ningún administrador y sin forma de recuperarlo desde la interfaz.

### C.4 Paginación con tope

El tamaño de página está acotado a 100. Sin ese tope, un cliente podría pedir un millón de registros y forzar al servidor a materializar la tabla entera, que es justo lo que la paginación evita.

Los campos por los que se puede ordenar son una **lista blanca**. No es una comodidad: pedir orden por un campo inexistente lanzaría una excepción y devolvería error 500 ante un simple parámetro mal escrito.

## Bloque D — Manejo de errores y validación

### D.1 Manejador global

**Archivos nuevos:** `common/exception/` — un manejador global y tres excepciones propias.

Sustituye el patrón anterior que convertía cualquier fallo en un 404 mentiroso.

Ahora cada situación devuelve el código que le corresponde: 404 no encontrado, 409 conflicto, 400 datos inválidos, 401 no autenticado, 403 sin permisos. Todos con el mismo formato de cuerpo.

Se incluye un manejador específico para las violaciones de restricción de base de datos: la comprobación previa en código tiene una ventana de carrera, así que hace falta la red de seguridad. Sin ella sería un error 500.

**Caso que se descubrió durante las pruebas:** enviar un rol inválido devolvía 500. La biblioteca de serialización lanzaba una excepción que no estaba contemplada. Se añadió su manejador, y ahora devuelve 400 indicando además cuáles son los valores válidos.

### D.2 Respuestas de autenticación

**Archivos nuevos:** `Config/PuntoEntradaAutenticacion.java` y `Config/ManejadorAccesoDenegado.java`

Sin estos componentes, Spring Security devuelve **403 a una petición sin token**, cuando lo correcto es 401.

La diferencia importa: el frontend no podía distinguir *"inicia sesión"* de *"no tienes permiso"*. Por eso ningún componente manejaba el caso de sesión caducada.

### D.3 Validación de entrada

La biblioteca de validación llevaba en el proyecto desde el principio sin usarse. Se añadieron reglas a todos los DTOs.

**Antes:** registrarse sin contraseña provocaba un error interno con traza. **Ahora:** un 400 indicando qué campo falla y por qué.

## Bloque E — Los secretos

### E.1 Sin valores por defecto

**Archivo modificado:** `application.properties`

Se eliminaron todos los valores por defecto de los secretos. Ahora, **si falta un secreto la aplicación no arranca**.

**Por qué es lo correcto:** es preferible no arrancar a arrancar sin seguridad. El comportamiento anterior hacía que un despliegue con el entorno mal configurado funcionara aparentemente bien, pero con los secretos públicos del repositorio.

### E.2 Archivos de entorno

**Archivos nuevos:** cuatro plantillas `.env.example`, una por ámbito.

Los archivos reales están ignorados por git. Las plantillas están versionadas y documentan qué hace falta.

Se generaron secretos nuevos para el entorno local con herramientas criptográficas.

**Lo que queda pendiente y solo puede hacer una persona:** rotar el client secret de GitHub en la web de GitHub. El valor anterior sigue en el historial de git; quitarlo del archivo no lo borra. Hasta que se rote, el login con GitHub no funciona, que es el comportamiento correcto.

### E.3 Bases de datos con autenticación

**Archivo modificado:** `docker-compose.yml`

Se añadió contraseña a Redis y autenticación a MongoDB, se movieron las credenciales a variables de entorno, y **se limitó la publicación de puertos a la interfaz local**.

Las credenciales se rotaron sin perder datos: se cambió la contraseña de PostgreSQL con una sentencia SQL y se creó el usuario de MongoDB manualmente, porque la inicialización automática de esa imagen **solo se ejecuta sobre un volumen vacío**.

### E.4 La migración de base de datos

**Archivo nuevo:** `db/migracion-01-seguridad.sql`

**Un hallazgo importante:** la configuración de actualización automática de esquema **no altera columnas que ya existen**. Se comprobó contra la base real: tras arrancar con las restricciones de unicidad declaradas en la entidad, las columnas **seguían sin restricción**.

Es decir: las anotaciones por sí solas no habrían arreglado nada. El script aplica el cambio de forma explícita, es idempotente, y trae en su cabecera las consultas para comprobar duplicados antes de ejecutarlo.

## Bloque F — Cerrar la ingesta de posiciones

**Archivo nuevo:** `Config/FiltroApiKeyGps.java`

Un filtro que exige una clave compartida en la cabecera de las peticiones de ingesta.

**Por qué una clave y no un token de usuario:** quien publica posiciones es el Servidor-TCP, un servicio, no una persona. Una clave compartida es el mecanismo adecuado para autenticación entre servicios.

**Detalle de implementación:** la comparación es en tiempo constante, para no filtrar información sobre la clave a través del tiempo de respuesta.

**Comportamiento si no hay clave configurada:** se rechaza toda ingesta. Mejor cortar el flujo que aceptarlo sin autenticar.

**Añadido posteriormente:** validación de que el identificador del dispositivo corresponda a un vehículo registrado. La clave impide que un tercero publique, pero no impide que un dispositivo mal configurado llene la base con identificadores inexistentes.

## Bloque G — Cerrar el WebSocket

**Archivo nuevo:** `WebSocket/InterceptorAutenticacionStomp.java`

Dos controles:

1. **Al conectar:** exige un token válido en la cabecera del mensaje de conexión.
2. **Al suscribirse:** comprueba que el dispositivo solicitado pertenezca a quien se suscribe.

**Por qué hacen falta los dos:** con solo el primero, cualquier usuario autenticado podría espiar cualquier vehículo. Sería el mismo agujero con un paso más.

**Detalle:** el token viaja en la cabecera del mensaje, no en la dirección. Una dirección con el token acabaría en los registros del servidor y en el historial del navegador.

Del lado del cliente, el hook de suscripción se modificó para enviar el token y para exponer los errores, que antes solo se registraban en la consola.

## Bloque H — Validación de audiencia en OAuth

**Archivo nuevo:** `usuario/service/ServicioOauth.java`

Este bloque extrae unas 180 líneas que vivían dentro del controlador, donde además **un método del controlador llamaba a otro método del controlador**, saltándose el framework por completo.

**La vulnerabilidad que corrige** es sutil y merece explicación.

El sistema validaba el token de Google llamando a un endpoint que devuelve el perfil del usuario. Ese endpoint acepta tokens emitidos para **cualquier aplicación** de Google.

Consecuencia: un atacante que consiguiera un token de la víctima desde otra aplicación —propia o comprometida— lo enviaba a nuestro sistema y **recibía una sesión válida como esa persona**. Se conoce como *token substitution*.

**La corrección:** verificar explícitamente que el token fue emitido *para nosotros*, comprobando el campo de audiencia contra nuestro identificador de aplicación. Para GitHub se usa el endpoint equivalente, que responde afirmativamente solo si el token pertenece a esta aplicación.

**Añadido:** se exige que el correo esté verificado. Sin esa comprobación, un correo no verificado permitiría reclamar la cuenta local de otra persona por simple coincidencia de dirección.

**Dato revelador:** el identificador de aplicación de Google estaba inyectado en el código y **nunca se usaba**. La pieza necesaria estaba ahí, sin conectar.

## Bloque I — Límite de intentos

**Archivos nuevos:** `Config/ServicioLimiteIntentos.java` y `Config/FiltroLimiteIntentos.java`

**Estado inicial:** ningún límite. Ni bloqueo tras fallos, ni espera creciente, ni verificación. La única fricción era el coste de calcular el hash de la contraseña.

**Diseño en dos capas:**

*Para el login*, contadores de intentos fallidos con bloqueo temporal. **Independientes por dirección de red y por cuenta**, para que un atacante externo no pueda bloquear la cuenta de otra persona simplemente fallando desde fuera.

*Para el resto de endpoints públicos* —registro, los flujos OAuth, la renovación de sesión y las consultas de disponibilidad—, un filtro que cuenta **todas** las peticiones, no solo las fallidas.

**Por qué esa diferencia:** en el registro no existe el concepto de "intento fallido", porque cada llamada crea una cuenta. Lo que hay que acotar ahí es el volumen.

**Nota de honestidad:** esta segunda capa se detectó como hueco *después* de dar el bloque por terminado. La primera implementación solo cubría el login, dejando el alta masiva de cuentas todavía viable.

## Bloque J — Sesiones renovables y revocables

**Archivos nuevos:** `Config/ServicioTokens.java` y `usuario/service/ServicioAutenticacion.java`
**Archivo reescrito:** `Config/JwtUtil.java`

**El problema:** un token firmado es válido hasta que caduca y **no se puede invalidar**. La configuración anterior usaba un único token de 24 horas. Un token robado servía un día entero y no había forma de cortarlo: no había renovación, ni identificador único, ni lista de revocación, ni cierre de sesión en el servidor. El frontend solo borraba el almacenamiento local.

**La solución, en dos piezas:**

- **Token de acceso**, 15 minutos. Corto a propósito: aunque se robe, la ventana es pequeña.
- **Token de renovación**, 7 días, **revocable** porque su identificador único vive en Redis.

**Rotación:** cada renovación revoca el token usado y emite otro. Si alguien roba un token de renovación y lo usa, el legítimo deja de funcionar y **el robo se hace evidente**.

**Revocación automática** en tres situaciones:

- Al cerrar sesión.
- Al **cambiar la contraseña** — si alguien te robó el token, cambiar la contraseña debe echarlo fuera.
- Al **desactivar o borrar** una cuenta.

**Detalle sobre el token de renovación:** no lleva el rol. Su única función es pedir un acceso nuevo, y el rol se relee de la base de datos en ese momento. Así, un cambio de rol surte efecto en la siguiente renovación.

**Mejoras técnicas adicionales** al reescribir el generador de tokens:

- Se actualizó la biblioteca desde una versión de 2021 con API obsoleta.
- La clave se deriva especificando la codificación de caracteres. Antes dependía de la configuración regional de la máquina, de modo que un secreto con caracteres especiales producía **claves distintas en Windows y en Linux**, y los tokens no validaban entre entornos.
- Se rechaza un secreto demasiado corto **al arrancar**, en lugar de fallar al emitir el primer token.
- Los dos tipos de token se distinguen internamente: un token de renovación presentado como token de acceso se rechaza.

## Bloque K — Los bugs del protocolo GT06

Este es el bloque con más impacto operativo directo: **aquí se estaban perdiendo posiciones**.

### K.1 El decodificador de mensajes

**Archivos nuevos:** `netty/DecodificadorTramaGt06.java` y `netty/TramaGt06.java`

Se introdujo un decodificador dedicado en la cadena de procesamiento, que es la clase que la biblioteca de red ofrece precisamente para este problema. **Acumula los bytes hasta tener un mensaje completo.**

Resuelve los tres fallos a la vez:

- **Fragmentación:** los mensajes partidos se reconstruyen.
- **Encuadre:** se respeta que la longitud incluye el checksum, sin consumir bytes de más.
- **Verificación:** el checksum se calcula y se compara; los mensajes corruptos se descartan con registro.

### K.2 Un bug encontrado por las propias pruebas

Al escribir las pruebas apareció un problema **que no se había previsto**.

La secuencia de inicio de un mensaje GT06 es un patrón de dos bytes concreto. Si ese patrón aparece por casualidad dentro de los datos —cosa perfectamente posible en un protocolo binario—, el decodificador lo tomaba por un inicio real, leía la longitud siguiente como si fuera válida, y se quedaba **esperando bytes que nunca llegarían**. La conexión quedaba bloqueada permanentemente.

**La solución:** cuando no hay bytes suficientes, distinguir entre "mensaje incompleto, hay que esperar" y "inicio falso, hay que resincronizar", comprobando si más adelante en el buffer hay otro inicio válido. Si la elección es incorrecta, la verificación de cierre y de checksum lo detecta y se vuelve a sincronizar: **nunca se procesa nada corrupto como válido**.

Este hallazgo ilustra el valor de las pruebas: el bug no era visible leyendo el código.

### K.3 El acuse de recibo del latido

El mensaje de latido tiene una estructura de campos concreta. El código leía la información del terminal, luego un byte que **etiquetaba como señal de red pero que en realidad es el voltaje**, y después tomaba como número de secuencia dos bytes que eran otra cosa.

Resultado: **el acuse de recibo devolvía un número inventado**.

Se corrigió leyendo el número de secuencia por posición desde el final del mensaje, que es donde siempre está.

### K.4 El envío al backend

**Archivo nuevo:** `Service/PublicadorBackend.java`

Dos problemas resueltos.

**Bloqueo del hilo de red.** El envío se hacía de forma síncrona desde el hilo de entrada/salida de la biblioteca de red, y sin tiempos límite. Un backend lento **congelaba ese hilo y con él a todos los dispositivos asignados**.

Ahora el envío ocurre en un hilo aparte y el cliente tiene tiempos límite configurados.

**Pérdida definitiva ante fallos.** Si el envío fallaba solo se imprimía el error. La posición se perdía para siempre.

Ahora hay una cola con reintentos de espera creciente: un segundo, dos, cuatro, ocho. La cola es **acotada a propósito**: si el backend lleva mucho tiempo caído, es preferible descartar lo más antiguo a agotar la memoria y tirar el proceso entero. Cada descarte queda registrado.

**Limitación conocida y documentada:** la cola vive en memoria, así que un reinicio pierde lo pendiente.

### K.5 Estado por conexión

El manejador de conexiones estaba declarado como componente compartible **teniendo campos mutables** por conexión.

Funcionaba de casualidad porque se creaba una instancia por conexión, ignorando el componente compartido. **Si alguien "arreglaba" eso conectando el componente, todos los dispositivos habrían compartido el mismo identificador.**

Se eliminaron las anotaciones engañosas y se documentó el diseño real.

Lo mismo con el servicio de última posición: guardaba **una sola posición global** en lugar de un mapa por dispositivo. Con dos dispositivos conectados, cada uno pisaba al otro.

### K.6 Correcciones adicionales

- **Cierre de conexiones mudas.** Las conexiones móviles mueren a menudo sin cerrar el socket, y quedaban colgadas hasta el tiempo límite del sistema operativo.
- **Puerto configurable.** Estaba escrito a mano. Y el archivo de contenedor expone el puerto HTTP pero **no el puerto por el que entran los GPS**.
- **Una propiedad de configuración definida y nunca usada:** las direcciones estaban escritas a mano en dos sitios.
- **Un endpoint roto:** hacía una petición de lectura contra un endpoint que solo acepta escritura, devolviendo siempre error. Además ignoraba el servicio local, que es donde está el dato.
- **Registro de eventos:** se pasó de impresiones por consola a un sistema de registro con niveles, y **el identificador del dispositivo se enmascara** en lugar de volcarse completo.

## Bloque L — Correcciones del backend

### L.1 La serialización de Redis

Se cambió el serializador por uno que **incluye la información de tipo en los datos**, que es lo que ya hacía correctamente otra parte del sistema.

**Advertencia importante, documentada en el código:** existía un método sin usar que parecía "el arreglo evidente". Conectarlo habría abierto **deserialización polimórfica sobre datos de caché**, es decir, un vector de ejecución remota de código si alguien conseguía escribir en la caché. Se eliminó para que nadie lo conecte por error.

### L.2 El orden de difusión

Se publicaba por WebSocket **antes** de guardar. Si el guardado fallaba, los clientes ya habían pintado una posición que no existía en ningún sitio. Se invirtió el orden.

### L.3 La hora del dispositivo

Se dejó de sobrescribir la hora recibida. Del lado del servidor TCP se cambió el campo a un tipo de fecha estándar con el nombre que espera el backend, de forma que la hora real llega hasta la base de datos.

### L.4 Otras

- El identificador de documento usaba la anotación de la biblioteca equivocada. Funcionaba por casualidad, por coincidencia de nombre.
- Se eliminó una anotación de tareas programadas que activaba un grupo de hilos sin que existiera ninguna tarea.
- Se desactivó una opción que provocaba una consulta adicional por cada elemento de un listado.
- Se añadió el endpoint de historial de recorrido: la consulta existía en el repositorio desde el principio pero **no había nada que la expusiera**.
- Se documentó la API con una interfaz navegable.

## Bloque M — El frontend

### M.1 Sesión y enrutado por rol

**Archivos nuevos:** `Service/sesion.js` y `Components/RutaProtegida.jsx`

**El problema reportado:** al entrar como administrador, se aterrizaba en el panel de usuario normal.

**La causa:** el backend siempre devolvió el rol, tanto en la respuesta como dentro del token. **El frontend lo descartaba.** Y el panel administrativo no tenía ninguna ruta que lo apuntara.

**La solución:** centralizar la sesión, guardar el rol, y decidir el destino según él.

Se añadió una guarda de rutas, que no existía: navegar directamente a una ruta privada sin sesión **renderizaba la interfaz completa** y solo fallaban las peticiones, que además nadie manejaba.

**Detalle:** la validez de la sesión se comprueba leyendo la fecha de caducidad **del propio token**, no solo verificando que haya algo guardado.

**Detalle de experiencia de uso:** un usuario autenticado sin permisos se redirige a su propio panel, no al login, que sería desconcertante estando ya identificado.

### M.2 El cliente HTTP único

**Archivo nuevo:** `Service/api.js`

Resuelve cuatro cosas de una vez:

1. **Dirección del servidor** desde variable de entorno. Había 14 llamadas con la dirección escrita a mano en 9 archivos.
2. **Cabecera de autorización** automática. Se repetía a mano en 11 sitios.
3. **Manejo del error de autenticación.** Ninguna llamada comprobaba si la respuesta era correcta, así que ante un 401 el componente **se quedaba en blanco para siempre**.
4. **Renovación transparente de sesión.** Se renueva antes de que caduque, y si aun así llega un 401 se reintenta una vez.

**Detalle de concurrencia:** si varias peticiones caducan a la vez, todas esperan a **la misma renovación** en lugar de disparar varias en paralelo.

### M.3 El panel administrativo con datos reales

**Archivo modificado:** `Components/Dashboard.jsx`

Existía como maqueta completa a nivel visual, pero **todo su contenido eran datos inventados**: 412 clientes, 8.924 dispositivos, dos filas de equipos ficticios. Y era código huérfano: ninguna ruta lo apuntaba.

Se conectó a los endpoints reales: métricas, listados con búsqueda, exportación a CSV, y activación/desactivación de vehículos.

El buscador era un texto decorativo sin funcionalidad; ahora busca de verdad, con espera para no lanzar una petición por cada tecla. Los botones no tenían acción asociada.

### M.4 Otras correcciones

- **Doble conexión en tiempo real.** El panel abría una suscripción y el mapa, que está dentro del panel, abría otra: **dos conexiones al mismo canal** por cada carga. Ahora el mapa recibe la posición por propiedades.
- **El botón de registro con GitHub no hacía nada.** No tenía acción asociada, aunque el mismo flujo sí estaba conectado en el login.
- **Un archivo de servicio con el nombre mal escrito** y con valores fijos que impedían desplegar fuera del entorno local.
- **Una redirección a una ruta inexistente** tras cambiar la contraseña: dejaba la pantalla en blanco.
- **Un texto suelto** que se renderizaba fuera de su botón.
- **El linter reparado.** Estaba configurado pero sus dependencias no estaban instaladas, y no había comando para ejecutarlo. Se pasó de 91 problemas a **cero errores**.

### M.5 Un cambio que rompía el frontend, y su corrección

Al exigir la contraseña actual para cambiarla, el formulario existente quedaba inservible: enviaba solo la nueva y **ni siquiera pedía la actual**.

Se añadió el campo. Es un ejemplo de que endurecer el backend puede romper el cliente, y de que ambos lados hay que moverlos juntos.

## Bloque N — Repositorio e infraestructura

- **Versiones unificadas** de Spring Boot. Había dos versiones mayores distintas en módulos que se comunican por HTTP, lo que implica bibliotecas incompatibles entre los dos lados.
- **Dependencias afinadas:** se sustituyó el paquete completo de la biblioteca de red por los tres componentes que realmente se usan. El anterior arrastraba todos los protocolos existentes.
- **Metadatos corregidos:** el identificador del proyecto seguía siendo el de la plantilla inicial.
- **El `.gitignore` corregido:** ignoraba el wrapper de compilación, que es justo lo que debe versionarse para que el proyecto compile en una máquina limpia. Y se retiraron del control de versiones 13 archivos compilados que ensuciaban cada revisión.
- **El orquestador de arranque reescrito:** solo funcionaba en Windows, no arrancaba el frontend ni las bases de datos, y al interrumpirlo **mataba el shell intermedio pero no el proceso real**, dejando los puertos ocupados. Ahora es multiplataforma, verifica la configuración antes de arrancar y termina correctamente los procesos hijos.
- **README completo**, que no existía. El único archivo de documentación era la plantilla sin tocar de la herramienta de creación del frontend.
- **Integración continua**, que no existía. Compila, prueba y revisa los tres módulos. Incluye dos comprobaciones específicas: **que no haya archivos de entorno versionados** y **que ningún secreto tenga valor por defecto**. Es una red de seguridad contra el problema original.

---

# PARTE 5 — Inventario completo de archivos

## 5.1 Archivos nuevos (53)

### BackEnd — Seguridad y configuración (10)

| Archivo | Propósito |
|---|---|
| `Config/SeguridadService.java` | Comprobaciones de propiedad usadas en las reglas de autorización |
| `Config/PuntoEntradaAutenticacion.java` | Respuesta 401 con cuerpo JSON para peticiones sin autenticar |
| `Config/ManejadorAccesoDenegado.java` | Respuesta 403 con el formato de error común |
| `Config/SembradorAdmin.java` | Crea el primer administrador al arrancar |
| `Config/FiltroApiKeyGps.java` | Protege la ingesta de posiciones con clave compartida |
| `Config/FiltroLimiteIntentos.java` | Límite de volumen en endpoints públicos |
| `Config/ServicioLimiteIntentos.java` | Contadores de intentos en Redis |
| `Config/ServicioTokens.java` | Almacén revocable de tokens de renovación |
| `WebSocket/InterceptorAutenticacionStomp.java` | Autentica y autoriza el canal en tiempo real |
| `usuario/model/Rol.java` | Tipo enumerado de roles |

### BackEnd — Servicios (2)

| Archivo | Propósito |
|---|---|
| `usuario/service/ServicioAutenticacion.java` | Emisión, renovación y cierre de sesiones |
| `usuario/service/ServicioOauth.java` | Autenticación externa con validación de audiencia |

### BackEnd — Panel administrativo (2)

| Archivo | Propósito |
|---|---|
| `admin/controller/AdminController.java` | Los 15 endpoints de administración |
| `admin/dto/ResumenAdminResponse.java` | Métricas de cabecera del panel |

### BackEnd — Común (6)

| Archivo | Propósito |
|---|---|
| `common/dto/ErrorResponse.java` | Formato único de error |
| `common/dto/PaginaResponse.java` | Envoltorio de paginación estable |
| `common/exception/ManejadorGlobalErrores.java` | Traduce excepciones a códigos HTTP |
| `common/exception/RecursoNoEncontradoException.java` | Excepción de dominio → 404 |
| `common/exception/RecursoDuplicadoException.java` | Excepción de dominio → 409 |
| `common/exception/OperacionNoPermitidaException.java` | Violación de regla de negocio → 409 |

### BackEnd — Objetos de transferencia (15)

| Archivo | Propósito |
|---|---|
| `usuario/dto/RegistroRequest.java` | **Cierra la escalada de privilegios**: no declara el campo rol |
| `usuario/dto/UsuarioResponse.java` | **Cierra la fuga de contraseñas**: no declara ese campo |
| `usuario/dto/ActualizarUsuarioRequest.java` | Actualización parcial de perfil |
| `usuario/dto/CrearUsuarioAdminRequest.java` | Alta con rol, solo para administradores |
| `usuario/dto/CambiarRolRequest.java` | Cambio de rol |
| `usuario/dto/CambiarContrasenaRequest.java` | Exige la contraseña actual |
| `usuario/dto/LoginRequest.java` | Credenciales validadas |
| `usuario/dto/RefrescarRequest.java` | Renovación y cierre de sesión |
| `usuario/dto/SesionResponse.java` | Respuesta de los cuatro flujos de autenticación |
| `usuario/dto/UsuarioMapper.java` | Conversión entidad ↔ objeto de transferencia |
| `vehiculo/dto/CrearVehiculoRequest.java` | Alta validada |
| `vehiculo/dto/ActualizarVehiculoRequest.java` | **Evita el borrado silencioso** de campos |
| `vehiculo/dto/AsignarVehiculoRequest.java` | Reasignación de propietario |
| `vehiculo/dto/VehiculoResponse.java` | Representación pública |
| `vehiculo/dto/VehiculoMapper.java` | Conversión entidad ↔ objeto de transferencia |

### BackEnd — Base de datos (1)

| Archivo | Propósito |
|---|---|
| `resources/db/migracion-01-seguridad.sql` | Restricciones de unicidad e índices que la actualización automática no aplica |

### Servidor-TCP (5)

| Archivo | Propósito |
|---|---|
| `netty/DecodificadorTramaGt06.java` | **Arregla las tres causas de pérdida de posiciones** |
| `netty/TramaGt06.java` | Mensaje ya desencuadrado y verificado |
| `Service/PublicadorBackend.java` | Envío asíncrono con reintentos |
| `test/.../DecodificadorTramaGt06Test.java` | 7 pruebas del desencuadre |
| `test/.../GT06UtilsTest.java` | 8 pruebas de decodificación y checksum |

### FrontEnd (4)

| Archivo | Propósito |
|---|---|
| `Service/sesion.js` | Sesión centralizada con rol y caducidad |
| `Service/api.js` | Cliente HTTP con renovación automática |
| `Service/GithubService.js` | Reemplaza al archivo con el nombre mal escrito |
| `Components/RutaProtegida.jsx` | Guarda de rutas por sesión y rol |

### Configuración y documentación (8)

| Archivo | Propósito |
|---|---|
| `.env.example` | Plantilla de credenciales de bases de datos |
| `BackEnd/.env.example` | Plantilla de secretos del backend |
| `Servidor-TCP/servidor-tpc/.env.example` | Plantilla del servidor TCP |
| `FrontEnd/.env.example` | Plantilla del frontend |
| `.github/workflows/ci.yml` | Integración continua con verificación de secretos |
| `README.md` | Documentación de puesta en marcha |
| `DIAGNOSTICO.md` | Auditoría original y plan |
| `PENDIENTES.md` | Registro de lo hecho y lo abierto |

## 5.2 Archivos modificados (49)

### BackEnd — Configuración (9)

| Archivo | Cambio principal |
|---|---|
| `Config/SecurityConfig.java` | **Activación de la seguridad por método**, reglas por ruta, CORS restringido, registro de filtros |
| `Config/JwtUtil.java` | Reescrito: dos tipos de token, identificador único, codificación explícita, biblioteca actualizada |
| `Config/JwtFilter.java` | Captura la excepción de cuenta no disponible → 401 en lugar de 500 |
| `Config/ServicioDetallesUsuario.java` | Construcción del permiso a partir del tipo enumerado |
| `Config/RedisConfig.java` | Serializador con información de tipo; eliminado el método peligroso |
| `Config/WebConfig.java` | Cliente HTTP con tiempos límite; eliminada la configuración CORS duplicada |
| `Config/MongoConfig.java` | Ajustes menores |
| `WebSocket/WebSocketConfig.java` | Registro del interceptor y orígenes restringidos |
| `RompGpsApplication.java` | Eliminada la anotación de tareas programadas sin uso |

### BackEnd — Dominio (10)

| Archivo | Cambio principal |
|---|---|
| `usuario/model/Usuario.java` | Rol como tipo enumerado, restricciones de unicidad, campo de contraseña excluido, relación problemática eliminada |
| `usuario/repository/UsuarioRepository.java` | Consultas de búsqueda paginada y conteos |
| `usuario/service/UsuarioService.java` | Reescrito: reglas de negocio, revocación de sesiones, sin caché problemática |
| `usuario/controller/UsuarioController.java` | Reescrito: de 400 líneas con llamadas externas a capa fina con autorización |
| `vehiculo/model/Vehiculo.java` | Documentación del diseño; enumerado muerto eliminado |
| `vehiculo/repository/VehiculoRepository.java` | Consultas por propietario, comprobaciones y conteos |
| `vehiculo/service/VehiculoService.java` | Actualización parcial correcta, validaciones, sin caché problemática |
| `vehiculo/controller/VehiculoController.java` | Objetos de transferencia y reglas de propiedad |
| `gps/model/GPSData.java` | Anotación de identificador corregida |
| `gps/service/GPSDataService.java` | Orden de persistencia, hora del dispositivo, validación de dispositivo registrado |

### BackEnd — Otros (3)

| Archivo | Cambio principal |
|---|---|
| `gps/controller/GPSDataController.java` | Autorización por propiedad y endpoint de historial |
| `resources/application.properties` | **Sin valores por defecto en secretos**; nuevas secciones de configuración |
| `pom.xml` | Biblioteca de tokens actualizada, documentación de API, metadatos |

### Servidor-TCP (8)

| Archivo | Cambio principal |
|---|---|
| `netty/GpsServerHandler.java` | Reescrito: estado por conexión, envío asíncrono, latido corregido, registro con enmascarado |
| `netty/GpsInitializer.java` | Cadena con decodificador y control de inactividad |
| `netty/ServerTcp.java` | Puerto configurable, opciones de socket, componente inyectado |
| `Model/GPSData.java` | Hora como tipo de fecha estándar |
| `Service/GpsDataService.java` | Mapa por dispositivo en lugar de una única posición global |
| `Controller/DataController.java` | Reescrito: consultaba un endpoint incompatible |
| `Config/ClienteConfig.java` | Tiempos límite |
| `resources/application.properties` | Configuración externalizada y clave de ingesta |
| `pom.xml` | Versión unificada, dependencias afinadas |

### FrontEnd (14)

| Archivo | Cambio principal |
|---|---|
| `App.jsx` | Ruta del panel administrativo, guardas y ruta por defecto |
| `Components/Dashboard.jsx` | **Conectado a datos reales**; buscador, exportación y acciones funcionales |
| `Components/Login.jsx` | Sesión centralizada y destino según rol |
| `Components/Registro.jsx` | Sesión centralizada; botón de GitHub conectado |
| `Components/AuthCallback.jsx` | Sesión centralizada |
| `Components/PanelControl.jsx` | Cierre de sesión unificado; posición pasada al mapa |
| `Components/Mapa.jsx` | Recibe la posición por propiedades: **una sola conexión** |
| `Components/PerfilUsuario.jsx` | Cierre de sesión unificado |
| `Components/CambiarContrasena.jsx` | Campo de contraseña actual; redirección corregida |
| `Components/PanelVehiculo.jsx` | Dirección desde variable de entorno |
| `Components/Producto.jsx` | Corrección de sintaxis detectada por el linter |
| `Service/GpsDataService.js` | Token en la conexión y exposición de errores |
| `eslint.config.js` | Configuración corregida y funcional |
| `package.json` | Comandos de linter, nombre y versión |

### Raíz (3)

| Archivo | Cambio principal |
|---|---|
| `docker-compose.yml` | Credenciales por variables, autenticación en las tres bases, puertos solo locales |
| `run.mjs` | Reescrito: multiplataforma, arranca todo, termina bien los procesos |
| `.gitignore` | Ya no ignora el wrapper de compilación |

## 5.3 Archivos eliminados (2)

| Archivo | Motivo |
|---|---|
| `FrontEnd/src/Service/GitgubService.js` | Nombre mal escrito; reemplazado por la versión correcta |
| `Servidor-TCP/.../ServidorTpcApplicationTests.java` | Prueba vacía que además requería toda la infraestructura levantada |

---

# PARTE 6 — La verificación

Nada se dio por bueno sin comprobarlo contra el sistema real en ejecución.

| Conjunto de pruebas | Resultado |
|---|---|
| Seguridad de extremo a extremo | **19 de 19** |
| Bloque de sesiones, ingesta y límites | **11 de 11** |
| Protocolo GT06, pruebas automatizadas | **15 de 15** |
| Dispositivo GPS simulado | Correcto |
| Canal en tiempo real | Correcto |
| Linter del frontend | 0 errores |
| Compilación de los tres módulos | Correcta |

## Comparativa antes y después

| Situación | Antes | Ahora |
|---|---|---|
| Registrarse con rol de administrador | Creaba un administrador | Devuelve rol de usuario normal |
| Contraseñas en las respuestas | Hash visible | Ausente |
| Usuario normal en zona de administración | Acceso completo | Prohibido |
| Leer o borrar datos ajenos | Permitido | Prohibido |
| Consultar la posición de un vehículo ajeno | Permitido | Prohibido |
| Escuchar el canal en tiempo real sin identificarse | Permitido | Rechazado |
| Enviar posiciones falsas | Permitido | Rechazado |
| Petición sin credenciales | 403 (confuso) | 401 (correcto) |
| Recurso inexistente | 404 falso o error interno | 404 real |
| Datos de registro inválidos | Error interno | 400 detallando el campo |
| Token de cuenta desactivada | Error interno | 401 |
| Actualización parcial de vehículo | Borraba campos | Los conserva |
| Administrador degradándose a sí mismo | Permitido | Bloqueado |
| Alta masiva de cuentas | Sin límite | Bloqueo tras 20 |
| Mensaje GPS fragmentado | Se perdía | Se reconstruye |
| Dos mensajes en el mismo paquete | Se perdía el segundo | Llegan los dos |
| Mensaje corrupto | Se procesaba | Se descarta |
| Hora del histórico | Hora de recepción | Hora del dispositivo |

## La prueba del dispositivo simulado

Se construyó un simulador que genera mensajes GT06 auténticos, con estructura y checksum válidos, y se conectó al servidor real.

Se comprobó:

1. **Identificación:** acuse de recibo correcto.
2. **Mensaje fragmentado:** enviado en dos partes con pausa entre ellas. **Llegó a la base de datos.**
3. **Dos mensajes juntos:** enviados en un solo envío. **Llegaron los dos.**
4. **Latido:** acuse con el número de secuencia correcto.
5. **Mensaje corrupto:** rechazado con registro, no guardado.
6. **Horas:** las almacenadas son las del dispositivo, no las de recepción.

**Salvedad importante:** esta prueba usa mensajes generados. Valida la lógica del decodificador, pero **el dispositivo físico real es la prueba definitiva**, porque cada fabricante introduce variaciones sobre el protocolo.

---

# PARTE 7 — Lo que queda abierto

## Requiere acción de una persona

**Rotar el client secret de GitHub.** Es lo único crítico pendiente. El valor anterior sigue en el historial de git; generar uno nuevo y **borrar el antiguo** en la configuración de GitHub es lo que corta el riesgo. Hasta entonces, el login con GitHub no funciona, que es el comportamiento deseado.

## Limitaciones conocidas, no descuidos

| Asunto | Situación |
|---|---|
| Token en almacenamiento del navegador | Un ataque de inyección de scripts podría leerlo. Mitigado por la vida corta y la revocación, no eliminado. La solución completa son cookies con marca de solo-servidor. |
| Sin cifrado de transporte | En producción hace falta certificado, o las credenciales viajan en claro. |
| Clave de ingesta compartida | Si se compromete el servidor TCP, sirve para todos los dispositivos. Autenticación individual sería el siguiente paso. |
| Documentación de API pública | Debe desactivarse en producción mediante su variable de configuración. |
| Sin registro de auditoría | No queda constancia de qué administrador cambió qué. |
| Rol de solo lectura | Declarado pero sin reglas propias. |
| Sin integridad referencial entre vehículo y propietario | Se valida en código, pero no hay restricción en la base de datos. |
| Cola de envío en memoria | Un reinicio del proceso pierde lo pendiente. |
| Cobertura de pruebas parcial | Cubierto el protocolo, que era lo crítico. Faltan las reglas de negocio y el frontend. |
| Convención de nombres | Dos paquetes con mayúscula inicial, contra la convención del lenguaje. |

---

# PARTE 8 — Conclusiones

## Los tres hallazgos más significativos

**1. La infraestructura de seguridad existía y no se usaba.** Los roles estaban en la base de datos, se convertían en permisos, viajaban en el token. Todo el cableado estaba puesto. Faltaba una anotación para que el sistema **consultara** esa información al decidir. Es un patrón habitual: el trabajo estaba hecho a medias y nadie cerró el círculo.

**2. Las anotaciones no bastaban.** Declarar las restricciones de unicidad en la entidad **no las creó en la base de datos**, porque la actualización automática de esquema no altera columnas existentes. Se descubrió al comprobar la base real. Sin esa comprobación, se habría dado por resuelto un problema que seguía abierto.

**3. Las pruebas encontraron un bug que la lectura del código no.** El caso de la secuencia de inicio falsa que bloqueaba la conexión no era visible razonando sobre el código. Apareció al ejercitarlo.

## Sobre el método

Dos decisiones que resultaron acertadas:

**Diagnosticar antes de tocar.** La auditoría inicial reveló que el problema no eran fallos aislados sino una cadena de ataque. Eso cambió el orden de trabajo: primero cerrar la escalada de privilegios, después construir el panel.

**Verificar contra el sistema real.** Cada bloque se comprobó ejecutándolo, no leyéndolo. Así aparecieron el asunto de las restricciones de base de datos, el error 500 con roles inválidos, el bug del decodificador y el hueco del límite de peticiones.

## Un apunte de honestidad

Dos elementos se dieron inicialmente por completos sin estarlo:

- El límite de peticiones **solo cubría el login**; el registro seguía sin restricción.
- La ingesta aceptaba **cualquier identificador de dispositivo**, incluso no registrado.

Ambos se detectaron al revisar el trabajo y se cerraron. Se mencionan porque **el registro de lo que se hizo tiene que incluir lo que se hizo mal**: un informe que solo cuenta los aciertos no sirve para aprender de él.
