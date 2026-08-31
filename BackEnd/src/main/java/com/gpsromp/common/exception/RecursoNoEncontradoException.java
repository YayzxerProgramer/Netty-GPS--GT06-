package com.gpsromp.common.exception;

/**
 * El recurso solicitado no existe. El manejador global la traduce a HTTP 404.
 *
 * Sustituye al patrón anterior de lanzar RuntimeException y capturarla en el
 * controlador para devolver notFound(), que convertía cualquier fallo interno
 * en un 404 mentiroso.
 */
public class RecursoNoEncontradoException extends RuntimeException {

    public RecursoNoEncontradoException(String mensaje) {
        super(mensaje);
    }

    public static RecursoNoEncontradoException usuario(Object id) {
        return new RecursoNoEncontradoException("No existe el usuario " + id);
    }

    public static RecursoNoEncontradoException vehiculo(Object id) {
        return new RecursoNoEncontradoException("No existe el vehículo " + id);
    }
}
