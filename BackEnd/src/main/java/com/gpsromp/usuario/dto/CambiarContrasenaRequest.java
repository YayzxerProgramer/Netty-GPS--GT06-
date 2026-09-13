package com.gpsromp.usuario.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Cambio de contraseña (PATCH /usuario/contrasena/{id}).
 *
 * contrasenaActual es OBLIGATORIA cuando un usuario cambia su propia contraseña,
 * y se ignora cuando quien llama es un ADMIN cambiando la de otra persona.
 *
 * Antes este endpoint solo pedía nuevaContrasena y no verificaba ni la propiedad
 * ni la contraseña anterior: cualquier cuenta autenticada podía apoderarse de
 * cualquier otra, incluida la del administrador.
 *
 * NOTA PARA EL FRONTEND: CambiarContrasena.jsx envía hoy solo
 * { nuevaContrasena }. Debe pasar a enviar { contrasenaActual, nuevaContrasena }.
 */
public record CambiarContrasenaRequest(

        String contrasenaActual,

        @NotBlank(message = "La nueva contraseña es obligatoria")
        @Size(min = 8, max = 72, message = "La contraseña debe tener entre 8 y 72 caracteres")
        String nuevaContrasena) {
}
