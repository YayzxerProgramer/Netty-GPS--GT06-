package com.gpsromp.admin.dto;

import java.util.UUID;
import com.gpsromp.usuario.model.Usuario;

public record PropietarioResumenResponse(
        UUID id,
        String nombre,
        String apellido,
        String usuario,
        String correo,
        String telefono,
        String nombreCompleto
) {
    public static PropietarioResumenResponse de(Usuario u) {
        if (u == null) return null;
        String completo = ((u.getNombre() != null ? u.getNombre() : "") + " " +
                (u.getApellido() != null ? u.getApellido() : "")).trim();
        if (completo.isBlank()) {
            completo = u.getUsuario();
        }
        return new PropietarioResumenResponse(
                u.getId(),
                u.getNombre(),
                u.getApellido(),
                u.getUsuario(),
                u.getCorreo(),
                u.getTelefono(),
                completo
        );
    }
}
