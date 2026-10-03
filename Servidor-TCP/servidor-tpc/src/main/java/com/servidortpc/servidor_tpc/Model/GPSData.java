package com.servidortpc.servidor_tpc.Model;

import java.time.Instant;

/**
 * Posición reportada por un dispositivo GT06.
 *
 * CAMBIO IMPORTANTE — registradoEn:
 *
 * Antes existía un campo "timestamp" de tipo String al que se le metía un texto
 * libre del estilo "Año: 2024 Mes: 5 Dia: 3...". El GPSData del BackEnd no
 * tiene ese campo, así que Jackson lo descartaba en silencio y el servicio
 * guardaba Instant.now(). Resultado: el histórico reflejaba la hora de INGESTA,
 * no la del fix GPS. Con reintentos o con el buffer del propio dispositivo, las
 * trazas quedaban desordenadas.
 *
 * Ahora se envía "registradoEn" como Instant, que es exactamente el nombre y el
 * tipo que espera la entidad del BackEnd, así que la hora real del dispositivo
 * llega hasta MongoDB.
 */
public class GPSData {

    private String imei;
    private Instant registradoEn;
    private double latitud;
    private double longitud;
    private int velocidad;
    private boolean gpsValido;
    private boolean acc;
    private boolean corteMotor;

    public GPSData() {
    }

    public GPSData(String imei, Instant registradoEn, double latitud, double longitud,
                   int velocidad, boolean gpsValido, boolean acc, boolean corteMotor) {
        this.imei = imei;
        this.registradoEn = registradoEn;
        this.latitud = latitud;
        this.longitud = longitud;
        this.velocidad = velocidad;
        this.gpsValido = gpsValido;
        this.acc = acc;
        this.corteMotor = corteMotor;
    }

    public String getImei() {
        return imei;
    }

    public void setImei(String imei) {
        this.imei = imei;
    }

    public Instant getRegistradoEn() {
        return registradoEn;
    }

    public void setRegistradoEn(Instant registradoEn) {
        this.registradoEn = registradoEn;
    }

    public double getLatitud() {
        return latitud;
    }

    public void setLatitud(double latitud) {
        this.latitud = latitud;
    }

    public double getLongitud() {
        return longitud;
    }

    public void setLongitud(double longitud) {
        this.longitud = longitud;
    }

    public int getVelocidad() {
        return velocidad;
    }

    public void setVelocidad(int velocidad) {
        this.velocidad = velocidad;
    }

    public boolean isGpsValido() {
        return gpsValido;
    }

    public void setGpsValido(boolean gpsValido) {
        this.gpsValido = gpsValido;
    }

    public boolean isAcc() {
        return acc;
    }

    public void setAcc(boolean acc) {
        this.acc = acc;
    }

    public boolean isCorteMotor() {
        return corteMotor;
    }

    public void setCorteMotor(boolean corteMotor) {
        this.corteMotor = corteMotor;
    }

    @Override
    public String toString() {
        return "GPSData{imei=%s, registradoEn=%s, lat=%f, lon=%f, vel=%d, gpsValido=%b, acc=%b}"
                .formatted(imei, registradoEn, latitud, longitud, velocidad, gpsValido, acc);
    }
}
