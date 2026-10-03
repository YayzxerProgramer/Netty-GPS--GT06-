package com.gpsromp.gps.dto;

import com.gpsromp.gps.model.GPSData;
import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class GPSHistorialResponse {

    private String imei;
    private List<GPSData> puntos;
    private double distanciaTotalKm;
    private double velocidadMaximaKmh;
    private double velocidadPromedioKmh;
    private long duracionTotalMinutos;
    private int cantidadParadas;
    private List<GPSParadaDTO> paradas;

    @Data
    @Builder
    public static class GPSParadaDTO {
        private double latitud;
        private double longitud;
        private String inicio;
        private String fin;
        private long duracionMinutos;
    }
}
