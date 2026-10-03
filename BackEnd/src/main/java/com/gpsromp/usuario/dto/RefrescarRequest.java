package com.gpsromp.usuario.dto;

import jakarta.validation.constraints.NotBlank;

/** Cuerpo de POST /usuario/refrescar y de POST /usuario/logout. */
public record RefrescarRequest(

        @NotBlank(message = "El token de refresco es obligatorio")
        String refreshToken) {
}
