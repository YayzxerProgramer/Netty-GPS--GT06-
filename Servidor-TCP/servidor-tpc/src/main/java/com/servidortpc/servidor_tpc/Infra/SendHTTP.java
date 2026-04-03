package com.servidortpc.servidor_tpc.Infra;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import com.servidortpc.servidor_tpc.Model.GPSData;

@Component

public class SendHTTP {

// RestTemplate : Es una clase de Spring utilizada para 
// hacer peticiones HTTP (GET, POST, etc.). En este caso, se usa para hacer peticiones al backend.

    private final RestTemplate restTemplate; // Es un objeto de la clase 
    //RestTemplate que se usa para hacer las peticiones HTTP.

    private final String backendUrl; // Es la URL base del backend, a partir de la cual se forman las peticiones.

    public SendHTTP(RestTemplate restTemplate, @Value("${backend.base-url}") String backendUrl) {
        this.restTemplate = restTemplate;
        this.backendUrl = backendUrl; 
    }

    public void EnviaDatos(GPSData gpsData) {
        String url = backendUrl + "/gps/data"; // Se forma la URL completa para la petición POST.
        restTemplate.postForObject(url, gpsData, Void.class); // Se hace la petición POST al backend, enviando el objeto gpsData.
    }
    

    
}

