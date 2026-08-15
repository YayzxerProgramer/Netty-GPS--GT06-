package com.servidortpc.servidor_tpc.Service;

import java.util.concurrent.atomic.AtomicReference;

import org.springframework.stereotype.Service;

import com.servidortpc.servidor_tpc.Model.GPSData;

@Service
public class GpsDataService {

    private final AtomicReference<GPSData> ultimoDato = new AtomicReference<>();

    public void recibirData(GPSData gpsData) {
        this.ultimoDato.set(gpsData);
    }

    public GPSData obtenerUltimoDato() {
        return ultimoDato.get();
    }
}
