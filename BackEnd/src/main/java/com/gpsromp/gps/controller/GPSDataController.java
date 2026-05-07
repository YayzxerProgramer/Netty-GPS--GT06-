package com.gpsromp.gps.controller;

import com.gpsromp.gps.model.GPSData;
import com.gpsromp.gps.service.GPSDataService;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/gps")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class GPSDataController {

    private final GPSDataService gpsDataService;

    @PostMapping
    public ResponseEntity<GPSData> saveGPSData(@RequestBody GPSData gpsData) {
        GPSData data = gpsDataService.save(gpsData);
        return ResponseEntity.ok(data);
    }

    @GetMapping("/last/{imei}") 
    public ResponseEntity<GPSData> getLastPosition(@PathVariable String imei) {
        Optional<GPSData> resultado = gpsDataService.getLastPosition(imei);
        return resultado.map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

}
