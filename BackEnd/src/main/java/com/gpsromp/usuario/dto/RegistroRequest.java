package com.gpsromp.usuario.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Cuerpo del registro público (POST /usuario).
 *
 * ESTE DTO ES EL ARREGLO DE LA ESCALADA DE PRIVILEGIOS.
 *
 * Antes el endpoint aceptaba la entidad Usuario completa, así que un body con
 * {"rol":"ADMIN"} creaba un administrador sin autenticarse. Aquí no existen los
 * campos rol, id, activo ni vehiculos: aunque el cliente los mande, Jackson los
 * descarta (FAIL_ON_UNKNOWN_PROPERTIES viene desactivado en Spring Boot).
 *
 * Registro.jsx sigue enviando rol:"USER" y activo:true en el body y NO se rompe:
 * esos campos simplemente se ignoran y el rol lo asigna el servidor.
 */
public record RegistroRequest(

        @NotBlank(message = "El nombre es obligatorio")
        @Size(max = 60, message = "El nombre no puede superar 60 caracteres")
        String nombre,

        @Size(max = 60, message = "El apellido no puede superar 60 caracteres")
        String apellido,

        @NotBlank(message = "El nombre de usuario es obligatorio")
        @Size(min = 3, max = 30, message = "El usuario debe tener entre 3 y 30 caracteres")
        @Pattern(regexp = "^[a-zA-Z0-9._-]+$",
                 message = "El usuario solo admite letras, números, punto, guion y guion bajo")
        String usuario,

        @NotBlank(message = "La contraseña es obligatoria")
        @Size(min = 8, max = 72, message = "La contraseña debe tener entre 8 y 72 caracteres")
        String contrasena,

        @NotBlank(message = "El correo es obligatorio")
        @Email(message = "El correo no tiene un formato válido")
        @Size(max = 120, message = "El correo no puede superar 120 caracteres")
        String correo,

        @Pattern(regexp = "^$|^[0-9+()\\s-]{7,20}$", message = "El teléfono no tiene un formato válido")
        String telefono) {
}
