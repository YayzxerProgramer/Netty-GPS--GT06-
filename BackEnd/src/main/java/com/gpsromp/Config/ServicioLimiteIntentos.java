package com.gpsromp.Config;

import java.time.Duration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Límite de intentos para los endpoints de autenticación.
 *
 * POR QUÉ EXISTE: login, registro y los tres flujos OAuth no tenían ningún
 * límite. Ni bloqueo tras N fallos, ni CAPTCHA, ni espera creciente. La única
 * fricción era el coste de BCrypt, lo que dejaba viables tanto la fuerza bruta
 * contra una cuenta concreta como el alta masiva de cuentas.
 *
 * Se cuenta en Redis, que ya forma parte del stack, con dos claves por
 * identificador: el contador de fallos (con ventana deslizante por TTL) y una
 * marca de bloqueo. Un login correcto limpia el contador.
 *
 * El identificador es la IP más el usuario cuando se conoce, para que un
 * atacante no pueda bloquear la cuenta de otra persona solo con fallar desde
 * fuera: los contadores por IP y por cuenta son independientes.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ServicioLimiteIntentos {

    private static final String PREFIJO_INTENTOS = "rl:intentos:";
    private static final String PREFIJO_BLOQUEO = "rl:bloqueo:";

    private final StringRedisTemplate redisTemplate;

    @Value("${seguridad.rate-limit.intentos}")
    private int maximoIntentos;

    @Value("${seguridad.rate-limit.ventana-segundos}")
    private long ventanaSegundos;

    @Value("${seguridad.rate-limit.bloqueo-segundos}")
    private long bloqueoSegundos;

    /** ¿Está bloqueado ahora mismo? */
    public boolean estaBloqueado(String identificador) {
        return Boolean.TRUE.equals(redisTemplate.hasKey(PREFIJO_BLOQUEO + identificador));
    }

    /** Segundos que faltan para poder reintentar. Sirve para la cabecera Retry-After. */
    public long segundosRestantes(String identificador) {
        Long ttl = redisTemplate.getExpire(PREFIJO_BLOQUEO + identificador);
        return (ttl == null || ttl < 0) ? 0 : ttl;
    }

    /**
     * Registra un intento fallido. Al llegar al máximo, bloquea.
     * @return true si este fallo ha provocado el bloqueo
     */
    public boolean registrarFallo(String identificador) {
        return registrarFallo(identificador, maximoIntentos);
    }

    /**
     * Igual que el anterior pero con umbral propio.
     *
     * Los endpoints públicos (registro, OAuth, refresco) necesitan un límite más
     * holgado que el login: ahí cada petición es legítima y lo que se acota es
     * el volumen, no los fallos.
     */
    public boolean registrarFallo(String identificador, int maximo) {
        String clave = PREFIJO_INTENTOS + identificador;

        Long intentos = redisTemplate.opsForValue().increment(clave);
        if (intentos != null && intentos == 1L) {
            // Primer fallo de la ventana: es cuando se fija el TTL.
            redisTemplate.expire(clave, Duration.ofSeconds(ventanaSegundos));
        }

        if (intentos != null && intentos >= maximo) {
            redisTemplate.opsForValue().set(
                    PREFIJO_BLOQUEO + identificador, "1", Duration.ofSeconds(bloqueoSegundos));
            redisTemplate.delete(clave);

            log.warn("Bloqueo por exceso de intentos: {} ({} fallos). Bloqueado {} s",
                    identificador, intentos, bloqueoSegundos);
            return true;
        }
        return false;
    }

    /** Un acceso correcto limpia el contador. */
    public void registrarExito(String identificador) {
        redisTemplate.delete(PREFIJO_INTENTOS + identificador);
        redisTemplate.delete(PREFIJO_BLOQUEO + identificador);
    }

    public int getMaximoIntentos() {
        return maximoIntentos;
    }
}
