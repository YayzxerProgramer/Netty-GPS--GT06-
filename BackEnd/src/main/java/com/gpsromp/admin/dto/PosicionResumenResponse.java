package com.gpsromp.admin.dto;

import java.time.Instant;
import com.gpsromp.gps.model.GPSData;

public record PosicionResumenResponse(
        double lat,
        double lng,
        int vel,
        long fecha,
        Instant fechaIso,
        boolean gpsValido,
        boolean acc,
        boolean corteMotor,
        long segundosDesdeReporte,
        double latitud,
        double longitud,
        int velocidad,
        Instant registradoEn
) {
    public static PosicionResumenResponse de(GPSData d, Instant ahora) {
        if (d == null) return null;
        Instant f = d.getRegistradoEn() != null ? d.getRegistradoEn() : d.getCreadosEn();
        if (f == null) f = ahora;
        long segs = Math.max(0, ahora.getEpochSecond() - f.getEpochSecond());
        long fechaMillis = f.toEpochMilli();

        return new PosicionResumenResponse(
                d.getLatitud(),
                d.getLongitud(),
                d.getVelocidad(),
                fechaMillis,
                f,
                d.isGpsValido(),
                d.isAcc(),
                d.isCorteMotor(),
                segs,
                d.getLatitud(),
                d.getLongitud(),
                d.getVelocidad(),
                f
        );
    }
}
