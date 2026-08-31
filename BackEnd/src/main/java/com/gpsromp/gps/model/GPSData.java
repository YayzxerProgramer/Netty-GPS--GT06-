package com.gpsromp.gps.model;

import java.time.Instant;

import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import org.springframework.data.annotation.Id;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Document(collection = "gps_data")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GPSData {

    @Id
    private String id;

    @Indexed
    private String imei;

    private double latitud;
    private double longitud;
    private int velocidad;
    private boolean gpsValido;
    private boolean acc;
    private boolean corteMotor;

    @Indexed
    @Field("registrado_en")
    private Instant registradoEn;

    @Builder.Default
    @Field("creados_en")
    private Instant creadosEn = Instant.now();
}
