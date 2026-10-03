package com.gpsromp.usuario.model;

/**
 * Roles del sistema. Se persiste con @Enumerated(EnumType.STRING), por lo que el
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
    VIEWER
}
