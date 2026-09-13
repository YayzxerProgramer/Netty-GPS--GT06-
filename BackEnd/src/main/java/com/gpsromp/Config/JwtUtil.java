package com.gpsromp.Config;

import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;

/**
 * Emisión y validación de tokens.
 *
 * Cambios respecto a la versión anterior:
 *
 *  - jjwt 0.12.6 en lugar de 0.11.5 (API de 2021, ya deprecada).
 *  - Dos tipos de token: acceso (15 min) y refresco (7 días). Antes había uno
 *    solo de 24 horas, sin refresco y sin forma de revocarlo.
 *  - Cada token lleva un identificador único (jti), que es lo que permite
 *    revocar un refresco concreto desde Redis.
 *  - La clave se deriva con UTF-8 explícito. Antes se usaba getBytes() sin
 *    charset, así que un secreto con caracteres no ASCII producía claves
 *    distintas en Windows y en Linux y los tokens no validaban entre entornos.
 *  - Se rechaza un secreto demasiado corto al arrancar, en lugar de fallar al
 *    emitir el primer token.
 */
@Component
@Slf4j
public class JwtUtil {

    /** Distingue un token de acceso de uno de refresco: sin esto, un refresco valdría para autenticar. */
    private static final String CLAIM_TIPO = "tipo";
    private static final String CLAIM_ROL = "rol";
    public static final String TIPO_ACCESO = "acceso";
    public static final String TIPO_REFRESCO = "refresco";

    /** HS256 exige al menos 256 bits de clave. */
    private static final int LONGITUD_MINIMA_SECRETO = 32;

    @Value("${jwt.secreto}")
    private String secreto;

    @Value("${jwt.expiracion}")
    private long expiracionAcceso;

    @Value("${jwt.refresco-expiracion}")
    private long expiracionRefresco;

    private SecretKey clave;

    @PostConstruct
    void inicializar() {
        byte[] bytes = secreto.getBytes(StandardCharsets.UTF_8);

        if (bytes.length < LONGITUD_MINIMA_SECRETO) {
            throw new IllegalStateException(
                    "jwt.secreto debe tener al menos " + LONGITUD_MINIMA_SECRETO
                            + " bytes para HS256. Genera uno con: openssl rand -base64 48");
        }

        this.clave = Keys.hmacShaKeyFor(bytes);
        log.info("JWT configurado: acceso {} min, refresco {} días",
                expiracionAcceso / 60000, expiracionRefresco / 86400000);
    }

    // ------------------------------------------------------------- emisión

    public String generarAccessToken(String nombreUsuario, String rol) {
        Date ahora = new Date();
        return Jwts.builder()
                .id(UUID.randomUUID().toString())
                .subject(nombreUsuario)
                .claim(CLAIM_ROL, rol)
                .claim(CLAIM_TIPO, TIPO_ACCESO)
                .issuedAt(ahora)
                .expiration(new Date(ahora.getTime() + expiracionAcceso))
                .signWith(clave)
                .compact();
    }

    /**
     * Token de refresco. No lleva el rol: su única función es pedir un acceso
     * nuevo, y el rol se vuelve a leer de la base de datos en ese momento, de
     * modo que un cambio de rol surte efecto en el siguiente refresco.
     */
    public String generarRefreshToken(String nombreUsuario, String jti) {
        Date ahora = new Date();
        return Jwts.builder()
                .id(jti)
                .subject(nombreUsuario)
                .claim(CLAIM_TIPO, TIPO_REFRESCO)
                .issuedAt(ahora)
                .expiration(new Date(ahora.getTime() + expiracionRefresco))
                .signWith(clave)
                .compact();
    }

    public long getExpiracionAccesoMs() {
        return expiracionAcceso;
    }

    public long getExpiracionRefrescoMs() {
        return expiracionRefresco;
    }

    // ----------------------------------------------------------- lectura

    public String extraerUsuario(String token) {
        return obtenerCuerpo(token).getSubject();
    }

    public String extraerRol(String token) {
        return obtenerCuerpo(token).get(CLAIM_ROL, String.class);
    }

    public String extraerJti(String token) {
        return obtenerCuerpo(token).getId();
    }

    public String extraerTipo(String token) {
        return obtenerCuerpo(token).get(CLAIM_TIPO, String.class);
    }

    // --------------------------------------------------------- validación

    /** Válido para autenticar: firma correcta, no caducado y de tipo acceso. */
    public boolean esAccesoValido(String token) {
        return esValidoDeTipo(token, TIPO_ACCESO);
    }

    /** Válido para refrescar. Que no esté revocado lo comprueba ServicioTokens. */
    public boolean esRefrescoValido(String token) {
        return esValidoDeTipo(token, TIPO_REFRESCO);
    }

    private boolean esValidoDeTipo(String token, String tipoEsperado) {
        try {
            Claims cuerpo = obtenerCuerpo(token);
            String tipo = cuerpo.get(CLAIM_TIPO, String.class);

            if (!tipoEsperado.equals(tipo)) {
                // Un refresco presentado como acceso (o al revés) se rechaza.
                log.debug("Tipo de token incorrecto: se esperaba {} y llegó {}", tipoEsperado, tipo);
                return false;
            }
            return true;

        } catch (ExpiredJwtException e) {
            log.debug("Token vencido: {}", e.getMessage());
            return false;
        } catch (JwtException | IllegalArgumentException e) {
            log.debug("Token inválido: {}", e.getMessage());
            return false;
        }
    }

    private Claims obtenerCuerpo(String token) {
        return Jwts.parser()
                .verifyWith(clave)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
