package com.gpsromp.gps.model;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.LocalDateTime;

@Document(collection = "gps_data")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GPSDataEntity {

    @Id
    private String id;

    @Indexed
    private String imei;

    private String timestamp;

    private double latitud;

    private double longitud;

    private int velocidad;

    private boolean gpsValido;

    private boolean acc;

    private boolean corteMotor;

    @Indexed
    @Field("created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    // Método de conveniencia para crear desde el modelo existente
    public static GPSDataEntity from(com.gpsromp.Model.GPSData gpsData) {
        return GPSDataEntity.builder()
                .imei(gpsData.getImei())
                .timestamp(gpsData.getTimestamp())
                .latitud(gpsData.getLatitud())
                .longitud(gpsData.getLongitud())
                .velocidad(gpsData.getVelocidad())
                .gpsValido(gpsData.isGpsValido())
                .acc(gpsData.isAcc())
                .corteMotor(gpsData.isCorteMotor())
                .build();
    }

    // Convertir a modelo existente
    public com.gpsromp.Model.GPSData toModel() {
        com.gpsromp.Model.GPSData model = new com.gpsromp.Model.GPSData();
        model.setImei(this.imei);
        model.setTimestamp(this.timestamp);
        model.setLatitud(this.latitud);
        model.setLongitud(this.longitud);
        model.setVelocidad(this.velocidad);
        model.setGpsValido(this.gpsValido);
        model.setAcc(this.acc);
        model.setCorteMotor(this.corteMotor);
        return model;
    }
}
