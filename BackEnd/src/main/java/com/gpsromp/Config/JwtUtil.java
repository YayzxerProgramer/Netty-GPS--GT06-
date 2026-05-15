package com.gpsromp.Config;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;

/*
 * Clase utilitaria que maneja todo lo relacionado con los tokens JWT.
 * Se encarga de generarlos, validarlos y extraer información de ellos.
 */
@Component
public class JwtUtil {

    /*
     * Clave secreta leída desde application.properties.
     * Se usa para firmar y verificar los tokens.
     * Nunca debe estar hardcodeada en el código fuente.
     */
    @Value("${jwt.secreto}")
    private String secreto;

    /*
     * Tiempo de expiración leído desde application.properties.
     * Viene en milisegundos.
     */
    @Value("${jwt.expiracion}")
    private long expiracion;

    /*
     * Convierte la clave secreta en un objeto Key que usa JJWT.
     * Usa el algoritmo HMAC-SHA256 para firmar.
     */
    private Key obtenerClave() {
        return Keys.hmacShaKeyFor(secreto.getBytes());
    }

    /*
     * Genera un token JWT con los datos del usuario.
     * Este token se devuelve al frontend después del login exitoso.
     *
     * Contiene:
     * - sub: nombre de usuario (quien es)
     * - rol: rol del usuario (qué puede hacer)
     * - iat: fecha de creación
     * - exp: fecha de vencimiento
     */
    public String generarToken(String nombreUsuario, String rol) {
        return Jwts.builder()
                .setSubject(nombreUsuario)
                .claim("rol", rol)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + expiracion))
                .signWith(obtenerClave(), SignatureAlgorithm.HS256)
                .compact();
    }

    /*
     * Extrae el nombre de usuario guardado en el token.
     * Se usa en el JwtFilter para saber quién está haciendo la petición.
     */
    public String extraerUsuario(String token) {
        return obtenerCuerpo(token).getSubject();
    }

    /*
     * Extrae el rol guardado en el token.
     * Útil si necesitas saber el rol sin consultar la BD.
     */
    public String extraerRol(String token) {
        return obtenerCuerpo(token).get("rol", String.class);
    }

    /*
     * Verifica si el token es válido.
     * Un token es inválido si:
     * - La firma no coincide (fue modificado)
     * - Ya venció (expiró)
     * - Está malformado
     */
    public boolean esValido(String token) {
        try {
            Jwts.parserBuilder()
                    .setSigningKey(obtenerClave())
                    .build()
                    .parseClaimsJws(token);
            return true;
        } catch (ExpiredJwtException e) {
            System.out.println("Token vencido: " + e.getMessage());
            return false;
        } catch (JwtException e) {
            System.out.println("Token inválido: " + e.getMessage());
            return false;
        }
    }

    /*
     * Método privado que parsea el token y devuelve su contenido (payload).
     * Lo usan los métodos extraerNombreUsuario y extraerRol.
     */
    private Claims obtenerCuerpo(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(obtenerClave())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }
}
