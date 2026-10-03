package com.gpsromp.common.exception;

/**
 * Ya existe un recurso con ese identificador único (usuario, correo, placa, imei).
 * El manejador global la traduce a HTTP 409 Conflict.
 */
public class RecursoDuplicadoException extends RuntimeException {

    public RecursoDuplicadoException(String mensaje) {
        super(mensaje);
    }
}
