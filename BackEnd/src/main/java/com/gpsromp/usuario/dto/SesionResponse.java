package com.gpsromp.usuario.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.gpsromp.usuario.model.Rol;

/**
 * Respuesta de los cuatro flujos de autenticación (login, Google, GitHub y
 * refresco).
 *
 * Los campos "token", "usuario" y "rol" conservan su nombre porque el frontend
 * ya los lee. Los nuevos son "refreshToken" y "expiraEnSegundos".
 *
 * @param token             access token, vida corta (15 min por defecto)
 * @param refreshToken      token de refresco, revocable desde Redis
 * @param usuario           nombre de usuario
 * @param rol               rol efectivo
 * @param expiraEnSegundos  vida del access token, para que el cliente lo
 *                          renueve antes de que caduque en vez de esperar a
 *                          recibir un 401
 * @param perfilCompleto    solo en el flujo de Google: indica si falta el
 *                          teléfono. Null en el resto.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record SesionResponse(
        String token,
        String refreshToken,
        String usuario,
        Rol rol,
        long expiraEnSegundos,
        Boolean perfilCompleto) {

    public static SesionResponse de(String token, String refreshToken, String usuario,
                                    Rol rol, long expiraEnMs) {
        return new SesionResponse(token, refreshToken, usuario, rol, expiraEnMs / 1000, null);
    }

    public SesionResponse conPerfilCompleto(boolean completo) {
        return new SesionResponse(token, refreshToken, usuario, rol, expiraEnSegundos, completo);
    }
}
