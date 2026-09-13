package com.gpsromp.common.exception;

/**
 * La petición está bien formada y el usuario está autorizado, pero la operación
 * viola una regla de negocio: degradar al último ADMIN, borrarse a sí mismo,
 * cambiar la contraseña sin aportar la actual, etc.
 *
 * El manejador global la traduce a HTTP 409 Conflict.
 */
public class OperacionNoPermitidaException extends RuntimeException {

    public OperacionNoPermitidaException(String mensaje) {
        super(mensaje);
    }
}
