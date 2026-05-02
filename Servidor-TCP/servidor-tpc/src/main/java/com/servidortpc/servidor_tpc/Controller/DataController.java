package com.servidortpc.servidor_tpc.Controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;

import com.servidortpc.servidor_tpc.Model.GPSData;

@RestController
@RequestMapping("/data/ubicacion")
public class DataController {

    private final RestTemplate restTemplate;
    private static final String BACKEND_URL = "http://localhost:8081/api/gps/last";

    public DataController(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @GetMapping("/last")
    public ResponseEntity<GPSData> getUltimoDato() {
        try {
            GPSData dato = restTemplate.getForObject(BACKEND_URL, GPSData.class);
            return dato != null ? ResponseEntity.ok(dato) : ResponseEntity.noContent().build();
        } catch (Exception e) { 
            return ResponseEntity.internalServerError().build();
        }
    }

}
