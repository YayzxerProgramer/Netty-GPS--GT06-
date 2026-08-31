-- ============================================================================
-- Migración 01 — Integridad de la tabla usuarios
-- ============================================================================
--
-- POR QUÉ HACE FALTA ESTE SCRIPT
--
-- La entidad Usuario declara @Column(unique = true, nullable = false) en
-- "usuario" y "correo", pero spring.jpa.hibernate.ddl-auto=update NO altera
-- columnas que ya existen: solo crea tablas y añade columnas nuevas. Se
-- comprobó contra la base de datos real que, tras arrancar con las anotaciones
-- puestas, las columnas seguían siendo nullable y sin restricción UNIQUE.
--
-- Sin estas restricciones, la única defensa contra duplicados son los existsBy*
-- del servicio, que son check-then-act: dos peticiones simultáneas pasan ambas
-- la comprobación, se crean dos usuarios con el mismo nombre, y a partir de ahí
-- findByUsuario lanza IncorrectResultSizeDataAccessException y el login queda
-- roto de forma permanente para los dos.
--
-- ANTES DE EJECUTAR: comprobar que no haya duplicados ni nulos.
--   SELECT usuario, COUNT(*) FROM usuarios GROUP BY usuario HAVING COUNT(*) > 1;
--   SELECT correo,  COUNT(*) FROM usuarios GROUP BY correo  HAVING COUNT(*) > 1;
--   SELECT COUNT(*) FROM usuarios WHERE usuario IS NULL OR correo IS NULL;
-- Si alguna devuelve filas, hay que resolverlas a mano: las sentencias de abajo
-- fallarán y la migración quedará sin aplicar.
--
-- CÓMO EJECUTAR
--   docker exec -i rompgps-postgres psql -U rompgps -d rompgps_users \
--     < BackEnd/src/main/resources/db/migracion-01-seguridad.sql
--
-- Es idempotente: se puede volver a ejecutar sin efecto.
-- ============================================================================

BEGIN;

-- Un usuario sin nombre de usuario o sin correo no puede autenticarse:
-- son datos obligatorios, no opcionales.
ALTER TABLE usuarios ALTER COLUMN usuario SET NOT NULL;
ALTER TABLE usuarios ALTER COLUMN correo  SET NOT NULL;

-- activo se consulta con getActivo() en ServicioDetallesUsuario; un null ahí
-- provocaría un NullPointerException durante la autenticación.
UPDATE usuarios SET activo = TRUE WHERE activo IS NULL;
ALTER TABLE usuarios ALTER COLUMN activo SET DEFAULT TRUE;
ALTER TABLE usuarios ALTER COLUMN activo SET NOT NULL;

-- Unicidad respaldada por la base de datos. DO $$ ... $$ porque Postgres no
-- admite IF NOT EXISTS en ADD CONSTRAINT.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uk_usuarios_usuario') THEN
        ALTER TABLE usuarios ADD CONSTRAINT uk_usuarios_usuario UNIQUE (usuario);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uk_usuarios_correo') THEN
        ALTER TABLE usuarios ADD CONSTRAINT uk_usuarios_correo UNIQUE (correo);
    END IF;
END $$;

-- Índice para el filtro por rol del listado del panel.
CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios (rol);

-- Índice para buscar los vehículos de un usuario. Vehiculo.id_usuario es un
-- UUID plano, no una asociación @ManyToOne, así que no hay clave foránea ni el
-- índice que una FK habría traído consigo.
CREATE INDEX IF NOT EXISTS idx_vehiculos_usuario_id ON vehiculos (usuario_id);

COMMIT;
