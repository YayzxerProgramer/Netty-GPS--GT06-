package com.gpsromp.Model;

public class GPSData {
    private String imei;
    private String timestamp;
    private double latitud;
    private double longitud;
    private int velocidad;
    private boolean gpsValido;
    private boolean acc;
    private boolean corteMotor;

    public GPSData() {
    }

    public GPSData(String imei, String timestamp, double latitud, double longitud, int velocidad, boolean gpsValido, boolean acc, boolean corteMotor) {
        this.imei = imei;
        this.timestamp = timestamp;
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

    public String getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(String timestamp) {
        this.timestamp = timestamp;
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
}
