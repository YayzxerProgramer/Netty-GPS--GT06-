package com.gpsromp.common.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;
import java.util.Map;

/**
 * Formato único de error para toda la API.
 *
 * El campo "error" se mantiene porque el frontend actual ya lee data.error en
 * Login.jsx, Registro.jsx y PanelVehiculo.jsx. Los demás campos son adicionales.
 *
 * @param estado    código HTTP
 * @param error     mensaje legible (el que muestra el frontend)
 * @param ruta      path de la petición
 * @param instante  momento del fallo
 * @param campos    errores de validación por campo; null si no aplica
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ErrorResponse(
        int estado,
        String error,
        String ruta,
        Instant instante,
        Map<String, String> campos) {

    public static ErrorResponse de(int estado, String error, String ruta) {
        return new ErrorResponse(estado, error, ruta, Instant.now(), null);
    }

    public static ErrorResponse deValidacion(int estado, String error, String ruta, Map<String, String> campos) {
        return new ErrorResponse(estado, error, ruta, Instant.now(), campos);
    }
}
