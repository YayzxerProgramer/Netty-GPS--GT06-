package com.gpsromp.vehiculo.dto;

import com.gpsromp.vehiculo.model.Vehiculo;

/** Mapeo entidad ↔ DTO para vehículos. Manual, por la misma razón que UsuarioMapper. */
public final class VehiculoMapper {

    private VehiculoMapper() {
    }

    public static VehiculoResponse aResponse(Vehiculo v) {
        if (v == null) {
            return null;
        }
        return new VehiculoResponse(
                v.getId(),
                v.getPlaca(),
                v.getImei(),
                v.getModelo(),
                v.getTipo(),
                v.getActivo(),
                v.getId_usuario(),
                v.getCreadoEn(),
                v.getActualizadoEn());
    }
}
