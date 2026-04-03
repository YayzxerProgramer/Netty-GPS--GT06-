package com.gpsromp.Service;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.gpsromp.Model.GPSData;

@Service
public class GpsDataService {

    private final RestTemplate restTemplate;
    private final String servidorTcpUrl;

    public GpsDataService(RestTemplate restTemplate, @Value("${servidor-tcp.base-url}") String servidorTcpUrl) {
        this.restTemplate = restTemplate;
        this.servidorTcpUrl = servidorTcpUrl;
    }

    @Scheduled(fixedRate = 5000)
    public void consumirDatos() {
        try {
            String url = servidorTcpUrl + "/data/ubicacion";
            List<GPSData> datos = restTemplate.exchange(
                url,
                HttpMethod.GET,
                null,
                new ParameterizedTypeReference<List<GPSData>>() {}
            ).getBody();

            if (datos != null && !datos.isEmpty()) {
                System.out.println("Datos consumidos del servidor TCP: " + datos.size() + " registros");
                for (GPSData data : datos) {
                    procesarDatos(data);
                }
            }
        } catch (Exception e) {
            System.err.println("Error al consumir datos del servidor TCP: " + e.getMessage());
        }
    }

    private void procesarDatos(GPSData data) {
        System.out.printf("Procesando: IMEI=%s, Lat=%f, Lon=%f, Vel=%d km/h%n",
                data.getImei(), data.getLatitud(), data.getLongitud(), data.getVelocidad());
    }
}

