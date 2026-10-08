package com.gpsromp.usuario.model;

import java.util.Locale;
import java.util.Map;
import java.util.Optional;

/**
 * Roles del sistema. Se persiste como texto (ver RolConverter), por lo que el
 * nombre de cada constante es literalmente lo que se guarda en la columna "rol".
 *
 * La authority de Spring Security se construye como "ROLE_" + name(), así que
 * ADMIN se corresponde con hasRole("ADMIN").
 */
public enum Rol {

    /** Acceso total al panel administrativo. */
    ADMIN,

    /** Usuario final: solo sus propios datos y sus propios vehículos. */
    USER,

    /** Solo lectura. Reservado, aún sin reglas propias. */
    VIEWER;

    /**
     * Valores que aparecen en bases de datos anteriores al enum y su rol actual.
     * Con @Enumerated(STRING) cualquiera de ellos lanzaba "No enum constant" al
     * leer la fila y tumbaba con un 500 todo listado que la incluyera.
     */
    public static final Map<String, Rol> EQUIVALENCIAS_LEGADAS = Map.of(
            "USUARIO", USER,
            "CLIENTE", USER,
            "ROLE_USER", USER,
            "ADMINISTRADOR", ADMIN,
            "ROLE_ADMIN", ADMIN,
            "LECTOR", VIEWER,
            "ROLE_VIEWER", VIEWER);

    /**
     * Interpreta un valor guardado sin distinguir mayúsculas ni espacios.
     * Vacío si no es un rol actual ni una equivalencia conocida.
     */
    public static Optional<Rol> interpretar(String valor) {
        if (valor == null || valor.isBlank()) {
            return Optional.empty();
        }
        String normalizado = valor.trim().toUpperCase(Locale.ROOT);
        for (Rol rol : values()) {
            if (rol.name().equals(normalizado)) {
                return Optional.of(rol);
            }
        }
        return Optional.ofNullable(EQUIVALENCIAS_LEGADAS.get(normalizado));
    }
}
