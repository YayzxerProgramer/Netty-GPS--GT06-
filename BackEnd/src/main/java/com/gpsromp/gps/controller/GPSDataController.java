package com.gpsromp.gps.controller;

import com.gpsromp.gps.model.GPSDataEntity;
import com.gpsromp.gps.service.GPSDataService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api/gps")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class GPSDataController {

    private final GPSDataService gpsDataService;
    /**
     * Guarda un nuevo registro GPS
     */
    @PostMapping
    public ResponseEntity<GPSDataEntity> saveGPSData(@RequestBody GPSDataEntity gpsData) {
        log.info("Received GPS data");
        GPSDataEntity saved = gpsDataService.save(gpsData);
        return ResponseEntity.ok(saved);
    }

    /**
     * Obtiene la última posición del GPS
     */
    @GetMapping("/last/{imei}")
    public ResponseEntity<GPSDataEntity> getLastPosition(@PathVariable String imei) {
        Optional<GPSDataEntity> result = gpsDataService.getLastPosition(imei);
        return result.map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

}
