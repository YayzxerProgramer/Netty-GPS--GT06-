package com.gpsromp.usuario.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Credenciales de login (POST /usuario/login).
 *
 * Antes se leía un Map<String,String> crudo sin comprobar nulls, así que un body
 * vacío construía un UsernamePasswordAuthenticationToken(null, null) y provocaba
 * un 500 en lugar de un 400.
 */
public record LoginRequest(

        @NotBlank(message = "El usuario es obligatorio")
        String usuario,

        @NotBlank(message = "La contraseña es obligatoria")
        String contrasena) {
}
