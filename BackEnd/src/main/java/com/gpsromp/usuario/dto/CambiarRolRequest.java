package com.gpsromp.usuario.dto;

import com.gpsromp.usuario.model.Rol;
import jakarta.validation.constraints.NotNull;

/**
 * Cambio de rol (PATCH /admin/usuarios/{id}/rol).
 *
 * Esta operación NO existía: UsuarioService.actualizarUsuario copiaba siete
 * campos e ignoraba deliberadamente el rol, así que no había forma de promover
 * ni degradar a nadie desde la API.
 *
 * Al ser el parámetro de tipo Rol, un valor como "SUPERADMIN" o "admin" en
 * minúscula falla en la deserialización y devuelve 400, no un rol corrupto.
 */
public record CambiarRolRequest(

        @NotNull(message = "El rol es obligatorio")
        Rol rol) {
}
