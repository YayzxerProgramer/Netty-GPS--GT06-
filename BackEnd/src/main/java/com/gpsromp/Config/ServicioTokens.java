package com.gpsromp.Config;

import java.time.Duration;
import java.util.UUID;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Almacén de tokens de refresco en Redis.
 *
 * POR QUÉ EXISTE: un JWT firmado es válido hasta que caduca y no se puede
 * invalidar. Con la configuración anterior —un único token de 24 horas— un
 * token robado del localStorage servía durante un día entero y no había forma
 * de cortarlo: no había refresco, ni jti, ni lista de revocación, ni logout en
 * el servidor (el frontend solo borraba el localStorage).
 *
 * Ahora el acceso dura 15 minutos y la sesión se sostiene con un refresco de 7
 * días que SÍ es revocable, porque su jti vive aquí. Cerrar sesión, o cerrar
 * todas las sesiones, es borrar la entrada correspondiente.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ServicioTokens {

    private static final String PREFIJO_REFRESCO = "auth:refresco:";
    private static final String PREFIJO_USUARIO = "auth:usuario:";

    private final StringRedisTemplate redisTemplate;

    /**
     * Registra un refresco recién emitido.
     *
     * Se guardan dos claves: una por jti (para validar y revocar uno concreto) y
     * un conjunto por usuario (para poder cerrar todas sus sesiones de golpe,
     * por ejemplo cuando un administrador lo desactiva).
     */
    public void registrar(String jti, String nombreUsuario, long duracionMs) {
        Duration ttl = Duration.ofMillis(duracionMs);

        redisTemplate.opsForValue().set(PREFIJO_REFRESCO + jti, nombreUsuario, ttl);
        redisTemplate.opsForSet().add(PREFIJO_USUARIO + nombreUsuario, jti);
        redisTemplate.expire(PREFIJO_USUARIO + nombreUsuario, ttl);
    }

    /** ¿Sigue vigente este refresco y pertenece a quien dice? */
    public boolean esVigente(String jti, String nombreUsuario) {
        String propietario = redisTemplate.opsForValue().get(PREFIJO_REFRESCO + jti);
        return nombreUsuario != null && nombreUsuario.equals(propietario);
    }

    /** Revoca un refresco concreto. Es lo que hace el logout. */
    public void revocar(String jti, String nombreUsuario) {
        redisTemplate.delete(PREFIJO_REFRESCO + jti);
        redisTemplate.opsForSet().remove(PREFIJO_USUARIO + nombreUsuario, jti);
    }

    /**
     * Revoca TODAS las sesiones de un usuario.
     * Se usa al cambiar la contraseña y al desactivar la cuenta: si alguien te
     * robó el token, cambiar la contraseña debe echarlo fuera.
     */
    public void revocarTodas(String nombreUsuario) {
        var jtis = redisTemplate.opsForSet().members(PREFIJO_USUARIO + nombreUsuario);

        if (jtis != null && !jtis.isEmpty()) {
            jtis.forEach(jti -> redisTemplate.delete(PREFIJO_REFRESCO + jti));
            log.info("Revocadas {} sesiones de '{}'", jtis.size(), nombreUsuario);
        }
        redisTemplate.delete(PREFIJO_USUARIO + nombreUsuario);
    }

    public String nuevoJti() {
        return UUID.randomUUID().toString();
    }
}
