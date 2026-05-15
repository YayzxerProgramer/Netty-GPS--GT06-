package com.gpsromp.Config;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;

@Component
public class JwtUtil {

    @Value("${jwt.secreto}")
    private String secreto;

    @Value("${jwt.expiracion}")
    private long expiracion;

    private Key obtenerClave() {
        return Keys.hmacShaKeyFor(secreto.getBytes());
    }

    public String generarToken(String nombreUsuario, String rol) {
        return Jwts.builder()
                .setSubject(nombreUsuario)
                .claim("rol", rol)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + expiracion))
                .signWith(obtenerClave(), SignatureAlgorithm.HS256)
                .compact();
    }

    public String extraerUsuario(String token) {
        return obtenerCuerpo(token).getSubject();
    }

    public String extraerRol(String token) {
        return obtenerCuerpo(token).get("rol", String.class);
    }

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

    private Claims obtenerCuerpo(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(obtenerClave())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }
}
