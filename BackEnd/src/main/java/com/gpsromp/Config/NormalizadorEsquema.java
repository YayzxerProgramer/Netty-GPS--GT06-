package com.gpsromp.config;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.NestedExceptionUtils;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import lombok.extern.slf4j.Slf4j;

/**
 * Alinea el esquema y los datos de PostgreSQL con las entidades al arrancar.
 *
 * POR QUÉ EXISTE: spring.jpa.hibernate.ddl-auto=update solo crea tablas y añade
 * columnas; NO cambia la nulabilidad ni añade restricciones a columnas que ya
 * existen. Una base creada con una versión anterior del código se queda con el
 * esquema viejo, y eso rompía el panel:
 *
 *  - vehiculos.imei NOT NULL → no se podía registrar un vehículo sin equipo;
 *  - usuario/correo sin UNIQUE → dos altas simultáneas creaban duplicados y el
 *    login de ambos quedaba roto para siempre.
 *
 * Antes esto vivía en db/migracion-01-seguridad.sql, que había que ejecutar a
 * mano; se borró del repositorio y nadie la aplicaba. Ahora corre sola.
 *
 * GARANTÍAS:
 *  - Idempotente: si el esquema ya está bien, no hace nada.
 *  - Nunca borra filas ni columnas.
 *  - Cada paso va en su propia transacción con lock_timeout: si una tabla está
 *    bloqueada por tráfico, ese paso se salta y se reintenta en el próximo
 *    arranque en lugar de dejar la aplicación esperando.
 *  - Si un paso no puede aplicarse (p. ej. hay duplicados), lo explica en el
 *    log y la aplicación arranca igual.
 *
 * Se desactiva con DB_NORMALIZAR_ESQUEMA=false.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
@Slf4j
public class NormalizadorEsquema implements CommandLineRunner {

    private final JdbcTemplate jdbc;
    private final TransactionTemplate transaccion;
    private final boolean activo;

    public NormalizadorEsquema(JdbcTemplate jdbc,
                               PlatformTransactionManager transactionManager,
                               @Value("${app.esquema.normalizar:${DB_NORMALIZAR_ESQUEMA:true}}") boolean activo) {
        this.jdbc = jdbc;
        this.transaccion = new TransactionTemplate(transactionManager);
        this.activo = activo;
    }

    @Override
    public void run(String... args) {
        if (!activo) {
            log.info("Normalización del esquema desactivada (DB_NORMALIZAR_ESQUEMA=false).");
            return;
        }

        String motor = jdbc.execute((ConnectionCallback<String>) c -> c.getMetaData().getDatabaseProductName());
        if (!"PostgreSQL".equalsIgnoreCase(motor)) {
            log.info("Normalización del esquema omitida: solo aplica a PostgreSQL (motor: {}).", motor);
            return;
        }

        paso("usuarios.rol obligatorio", () -> exigirNoNulo("usuarios", "rol"));
        paso("usuarios.activo obligatorio", this::normalizarActivo);
        paso("usuarios.usuario obligatorio", () -> exigirNoNulo("usuarios", "usuario"));
        paso("usuarios.correo obligatorio", () -> exigirNoNulo("usuarios", "correo"));
        paso("vehiculos.imei opcional", this::permitirImeiNulo);
        paso("usuarios.usuario único", () -> exigirUnico("usuarios", "usuario"));
        paso("usuarios.correo único", () -> exigirUnico("usuarios", "correo"));
        paso("vehiculos.placa única", () -> exigirUnico("vehiculos", "placa"));
        paso("vehiculos.imei único", () -> exigirUnico("vehiculos", "imei"));
        paso("índices de búsqueda", this::crearIndices);
    }

    // ================================================================= pasos

    /** ServicioDetallesUsuario consulta getActivo(): un null ahí rompe el login. */
    private void normalizarActivo() {
        if (!existeColumna("usuarios", "activo")) return;
        int filas = jdbc.update("UPDATE usuarios SET activo = TRUE WHERE activo IS NULL");
        if (filas > 0) log.info("usuarios.activo: {} filas sin valor pasan a TRUE.", filas);
        jdbc.execute("ALTER TABLE usuarios ALTER COLUMN activo SET DEFAULT TRUE");
        exigirNoNulo("usuarios", "activo");
    }

    /** La entidad declara imei nullable: un vehículo puede darse de alta sin equipo. */
    private void permitirImeiNulo() {
        if (Boolean.FALSE.equals(esNulable("vehiculos", "imei"))) {
            jdbc.execute("ALTER TABLE vehiculos ALTER COLUMN imei DROP NOT NULL");
            log.info("vehiculos.imei admite NULL: ya se pueden registrar vehículos sin equipo GPS.");
        }
    }

    private void crearIndices() {
        if (existeColumna("usuarios", "rol")) {
            jdbc.execute("CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios (rol)");
        }
        // Vehiculo.id_usuario es un UUID plano, sin @ManyToOne: no hay clave
        // foránea ni el índice que una FK habría traído consigo.
        if (existeColumna("vehiculos", "usuario_id")) {
            jdbc.execute("CREATE INDEX IF NOT EXISTS idx_vehiculos_usuario_id ON vehiculos (usuario_id)");
        }
    }

    // ============================================================ utilidades

    private void exigirNoNulo(String tabla, String columna) {
        if (!Boolean.TRUE.equals(esNulable(tabla, columna))) return;

        Long nulos = jdbc.queryForObject(
                "SELECT COUNT(*) FROM " + tabla + " WHERE " + columna + " IS NULL", Long.class);
        if (nulos != null && nulos > 0) {
            log.warn("{}.{} tiene {} filas en NULL; no se puede marcar como obligatoria. "
                    + "Revísalas con: SELECT * FROM {} WHERE {} IS NULL;", tabla, columna, nulos, tabla, columna);
            return;
        }
        jdbc.execute("ALTER TABLE " + tabla + " ALTER COLUMN " + columna + " SET NOT NULL");
        log.info("{}.{} marcada como NOT NULL.", tabla, columna);
    }

    /**
     * Añade UNIQUE si la columna no tiene ya un índice único propio (Hibernate
     * crea los suyos con nombres aleatorios tipo uk8l4f..., así que se busca por
     * columna y no por nombre).
     */
    private void exigirUnico(String tabla, String columna) {
        if (!existeColumna(tabla, columna) || tieneIndiceUnico(tabla, columna)) return;

        Long duplicados = jdbc.queryForObject(
                "SELECT COUNT(*) FROM (SELECT " + columna + " FROM " + tabla + " WHERE " + columna
                        + " IS NOT NULL GROUP BY " + columna + " HAVING COUNT(*) > 1) d", Long.class);
        if (duplicados != null && duplicados > 0) {
            // ERROR y no WARN: sin la restricción la unicidad depende solo de la
            // comprobación del servicio, que dos altas simultáneas se saltan.
            log.error("{}.{} tiene {} valores repetidos: la unicidad NO está garantizada por la base de datos "
                    + "y el login de esas cuentas falla. Elimina los duplicados y reinicia; se localizan con: "
                    + "SELECT {}, COUNT(*) FROM {} GROUP BY {} HAVING COUNT(*) > 1;",
                    tabla, columna, duplicados, columna, tabla, columna);
            return;
        }
        jdbc.execute("ALTER TABLE " + tabla + " ADD CONSTRAINT uk_" + tabla + "_" + columna
                + " UNIQUE (" + columna + ")");
        log.info("{}.{} ahora es UNIQUE.", tabla, columna);
    }

    /** TRUE/FALSE según la columna, o null si la tabla o la columna no existen. */
    private Boolean esNulable(String tabla, String columna) {
        List<String> r = jdbc.queryForList(
                "SELECT is_nullable FROM information_schema.columns "
                        + "WHERE table_schema = current_schema() AND table_name = ? AND column_name = ?",
                String.class, tabla, columna);
        return r.isEmpty() ? null : "YES".equals(r.get(0));
    }

    private boolean existeColumna(String tabla, String columna) {
        return esNulable(tabla, columna) != null;
    }

    private boolean tieneIndiceUnico(String tabla, String columna) {
        Boolean existe = jdbc.queryForObject("""
                SELECT EXISTS (
                    SELECT 1
                    FROM pg_index i
                    JOIN pg_class t ON t.oid = i.indrelid
                    JOIN pg_namespace n ON n.oid = t.relnamespace
                    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = i.indkey[0]
                    WHERE i.indisunique AND i.indnatts = 1
                      AND n.nspname = current_schema() AND t.relname = ? AND a.attname = ?)""",
                Boolean.class, tabla, columna);
        return Boolean.TRUE.equals(existe);
    }

    /**
     * Ejecuta un paso en su propia transacción. lock_timeout evita que un ALTER
     * se quede esperando detrás del tráfico de una base en producción.
     */
    private void paso(String nombre, Runnable accion) {
        try {
            transaccion.executeWithoutResult(estado -> {
                jdbc.execute("SET LOCAL lock_timeout = '5s'");
                accion.run();
            });
        } catch (RuntimeException e) {
            log.warn("Normalización del esquema: el paso '{}' no se aplicó ({}). "
                    + "Se reintentará en el próximo arranque.", nombre,
                    NestedExceptionUtils.getMostSpecificCause(e).getMessage());
        }
    }
}
