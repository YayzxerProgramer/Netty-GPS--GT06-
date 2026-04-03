package com.servidortpc.servidor_tpc.Controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.servidortpc.servidor_tpc.Model.GPSData;
import com.servidortpc.servidor_tpc.Service.GpsDataService;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;


@RestController
@RequestMapping("/data/ubicacion")
public class DataController {

    private final GpsDataService gpsDataService;

    public DataController(GpsDataService gpsDataService) {
        this.gpsDataService = gpsDataService;
    }

    @PostMapping
    public ResponseEntity<Void> receive(@RequestBody GPSData gpsData) {
        gpsDataService.recibirData(gpsData);
        return ResponseEntity.noContent().build();
    }

    @GetMapping
    public ResponseEntity<List<GPSData>> getAll() {
        List<GPSData> datos = gpsDataService.obtenerDatos();
        return ResponseEntity.ok(datos);
    }


}
