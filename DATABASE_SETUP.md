# Configuración de Bases de Datos - RompGPS

Este documento describe cómo configurar y ejecutar las bases de datos para el proyecto RompGPS.

## Arquitectura de Datos

| Base de Datos | Propósito | Puerto |
|--------------|-----------|--------|
| **PostgreSQL** | Usuarios y autenticación | 5432 |
| **MongoDB** | Datos GPS (tracking, histórico) | 27017 |
| **Redis** | Caché de consultas frecuentes | 6379 |

## Requisitos

- Docker Desktop instalado, O
- PostgreSQL 16+, MongoDB 7+, Redis 7+ instalados localmente

## Opción Recomendada: Docker Compose

### 1. Iniciar las bases de datos

```bash
# Desde la raíz del proyecto
docker-compose up -d
```

### 2. Verificar que los servicios estén corriendo

```bash
docker-compose ps
```

Deberías ver:
- `rompgps-postgres` - PostgreSQL
- `rompgps-mongodb` - MongoDB
- `rompgps-redis` - Redis

### 3. Conectar a las bases de datos

**PostgreSQL:**
```bash
docker exec -it rompgps-postgres psql -U postgres -d rompgps_users
```

O desde tu máquina local:
```bash
psql -h localhost -U postgres -d rompgps_users
```
Password: `rompgps2026` (o el que definiste en `.env`)

**MongoDB:**
```bash
docker exec -it rompgps-mongodb mongosh
```

O desde tu máquina local:
```bash
mongosh mongodb://localhost:27017/rompgps_data
```

**Redis:**
```bash
docker exec -it rompgps-redis redis-cli
```

O desde tu máquina local:
```bash
redis-cli -h localhost -p 6379
```

### 4. Detener las bases de datos

```bash
docker-compose down
```

Para también eliminar los volúmenes (¡cuidado! se borran los datos):
```bash
docker-compose down -v
```

## Opción B: Instalación Local

### PostgreSQL

1. Descargar e instalar desde: https://www.postgresql.org/download/
2. Crear base de datos:
```sql
CREATE DATABASE rompgps_users;
```
3. Ejecutar el script de inicialización en `init-scripts/postgres/001-init-users.sql`

### MongoDB

1. Descargar e instalar desde: https://www.mongodb.com/try/download/community
2. Iniciar MongoDB:
```bash
mongod --dbpath /ruta/a/tu/data
```

### Redis

1. Descargar desde: https://redis.io/download/
2. En Windows, usar WSL o descargar desde: https://github.com/microsoftarchive/redis/releases

## Variables de Entorno

Crear un archivo `.env` en la raíz del proyecto:

```env
# PostgreSQL
POSTGRES_PASSWORD=rompgps2026

# Redis (vacío por defecto)
REDIS_PASSWORD=

# MongoDB
MONGO_URI=mongodb://localhost:27017/rompgps_data
```

## Endpoints de la API

### Usuarios (PostgreSQL)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/users` | Listar todos los usuarios |
| GET | `/api/users/{id}` | Obtener usuario por ID |
| GET | `/api/users/username/{username}` | Obtener usuario por nombre |
| POST | `/api/users` | Crear nuevo usuario |
| PUT | `/api/users/{id}` | Actualizar usuario |
| DELETE | `/api/users/{id}` | Eliminar usuario |
| PATCH | `/api/users/{id}/toggle-active` | Activar/desactivar usuario |
| POST | `/api/users/authenticate` | Autenticar usuario |

### Datos GPS (MongoDB + Redis Caché)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/gps` | Guardar registro GPS |
| POST | `/api/gps/batch` | Guardar múltiples registros |
| GET | `/api/gps/last/{imei}` | Última posición (con caché) |
| GET | `/api/gps/last-100/{imei}` | Últimas 100 posiciones |
| GET | `/api/gps/history/{imei}` | Histórico por fecha |
| GET | `/api/gps/exists/{imei}` | Verificar si IMEI existe |
| GET | `/api/gps/stats/{imei}` | Estadísticas del dispositivo |

## Usuario por Defecto

El script de inicialización crea un usuario admin:

- **Username:** `admin`
- **Password:** `admin123`
- **Role:** `ADMIN`
- **Email:** `admin@rompgps.com`

## Caché de Redis

La caché se usa para:

1. **Última posición** (TTL: 5 minutos) - Se invalida al recibir nuevos datos
2. **Histórico por rango** (TTL: 10 minutos) - Consultas frecuentes de histórico

Para ver las keys en caché:
```bash
redis-cli KEYS 'gps::*'
```

Para limpiar la caché:
```bash
redis-cli FLUSHDB
```

## Solución de Problemas

### Error: "Connection refused" a PostgreSQL

Verifica que el contenedor esté corriendo:
```bash
docker-compose ps
```

Revisa los logs:
```bash
docker-compose logs postgres
```

### Error: MongoDB no conecta

Asegúrate de que MongoDB esté corriendo:
```bash
docker-compose logs mongodb
```

### Redis no guarda en caché

Verifica la conexión:
```bash
redis-cli ping
```
Debería responder: `PONG`

### Limpiar todo y empezar de cero

```bash
docker-compose down -v
docker-compose up -d
```

## Próximos Pasos

1. Iniciar el backend: `./run.mjs` (o `mvn spring-boot:run`)
2. Verificar conexión a las bases de datos en los logs
3. Probar endpoints con Postman o curl
