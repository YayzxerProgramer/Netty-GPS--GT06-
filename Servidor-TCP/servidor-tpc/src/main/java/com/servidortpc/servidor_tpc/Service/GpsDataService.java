package com.servidortpc.servidor_tpc.Service;

import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;

import com.servidortpc.servidor_tpc.Infra.SendHTTP;
import com.servidortpc.servidor_tpc.Model.GPSData;

@Service
public class GpsDataService {

    private final SendHTTP backendClient;
    private final List<GPSData> datosRecibidos = new ArrayList<>();

    public GpsDataService(SendHTTP backendClient) {
        this.backendClient = backendClient;
    }

    public void recibirData(GPSData gpsData) {
        datosRecibidos.add(gpsData);
        // TODO: Habilitar cuando esté disponible el segundo servicio
        // backendClient.EnviaDatos(gpsData);
    }

    public List<GPSData> obtenerDatos() {
        return datosRecibidos;
    }
}
