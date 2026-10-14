package com.gpsromp.usuario.model;

/**
 * Roles del sistema. Se persiste con @Enumerated(EnumType.STRING), por lo que el
 * nombre de cada constante es literalmente lo que se guarda en la columna "rol".
 *
 * La authority de Spring Security se construye como "ROLE_" + name(), así que
 * ADMINISTRADOR se corresponde con hasRole("ADMINISTRADOR").
 */
public enum Rol {

    /** Acceso total al panel administrativo. */
    ADMINISTRADOR,

    /** Usuario final: solo sus propios datos y sus propios vehículos. */
    USUARIO,

    /** Solo lectura. Reservado, aún sin reglas propias. */
    VIEWER
}
