package com.gpsromp.vehiculo.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.UUID;

/**
 * Reasignación de propietario (PUT /admin/vehiculos/{id}/usuario).
 *
 * Un id_usuario null desasigna el vehículo, que es una operación legítima
 * (vehículo en stock, sin cliente). Por eso el campo no lleva @NotNull.
 *
 * Cuando no es null, el servicio comprueba que el usuario exista antes de
 * guardar: hoy no hay clave foránea que lo garantice, porque Vehiculo.id_usuario
 * es un UUID plano y no una asociación @ManyToOne.
 */
public record AsignarVehiculoRequest(

        @JsonProperty("id_usuario") UUID idUsuario) {
}
