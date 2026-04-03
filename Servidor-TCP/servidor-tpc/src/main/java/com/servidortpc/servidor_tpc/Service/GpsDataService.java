package com.servidortpc.servidor_tpc.Service;

import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;

import com.servidortpc.servidor_tpc.Model.GPSData;

@Service
public class GpsDataService {

    private final List<GPSData> datosRecibidos = new ArrayList<>();

    public void recibirData(GPSData gpsData) {
        datosRecibidos.add(gpsData);
    }

    public List<GPSData> obtenerDatos() {
        return datosRecibidos;
    }
}
