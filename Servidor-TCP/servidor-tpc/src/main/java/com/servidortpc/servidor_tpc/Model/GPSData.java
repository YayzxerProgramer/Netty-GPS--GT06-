package com.servidortpc.servidor_tpc.Model;

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

    public void setImei(String imei) {
        this.imei = imei;
    }

    public void setTimestamp(String timestamp) {
        this.timestamp = timestamp;
    }

    public void setLatitud(double latitud) {
        this.latitud = latitud;
    }

    public void setLongitud(double longitud) {
        this.longitud = longitud;
    }

    public void setVelocidad(int velocidad) {
        this.velocidad = velocidad;
    }

    public void setGpsValido(boolean gpsValido) {
        this.gpsValido = gpsValido;
    }

    public void setAcc(boolean acc) {
        this.acc = acc;
    }

    public void setCorteMotor(boolean corteMotor) {
        this.corteMotor = corteMotor;
    }

    public String getImei() {
        return imei;
    }

    public String getTimestamp() {
        return timestamp;
    }

    public double getLatitud() {
        return latitud;
    }

    public double getLongitud() {
        return longitud;
    }

    public int getVelocidad() {
        return velocidad;
    }

    public boolean isGpsValido() {
        return gpsValido;
    }

    public boolean getAcc() {
        return acc;
    }

    public boolean getCorteMotor() {
        return corteMotor;
    }

}
