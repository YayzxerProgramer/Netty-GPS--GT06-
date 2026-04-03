package com.gpsromp.gps.controller;

import com.gpsromp.Model.GPSData;
import com.gpsromp.gps.model.GPSDataEntity;
import com.gpsromp.gps.service.GPSDataService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
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
    public ResponseEntity<GPSDataEntity> saveGPSData(@RequestBody GPSData gpsData) {
        log.info("Received GPS data for IMEI: {}", gpsData.getImei());
        GPSDataEntity saved = gpsDataService.save(gpsData);
        return ResponseEntity.ok(saved);
    }

    /**
     * Obtiene la última posición de un dispositivo por IMEI
     */
    @GetMapping("/last/{imei}")
    public ResponseEntity<GPSDataEntity> getLastPosition(@PathVariable String imei) {
        Optional<GPSDataEntity> result = gpsDataService.getLastPosition(imei);
        return result.map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Obtiene el histórico de posiciones en un rango de fechas
     */
    @GetMapping("/history/{imei}")
    public ResponseEntity<List<GPSDataEntity>> getHistory(
            @PathVariable String imei,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end
    ) {
        List<GPSDataEntity> result = gpsDataService.getHistory(imei, start, end);
        return ResponseEntity.ok(result);
    }

    /**
     * Obtiene las últimas 100 posiciones de un dispositivo
     */
    @GetMapping("/last-100/{imei}")
    public ResponseEntity<List<GPSDataEntity>> getLast100Positions(@PathVariable String imei) {
        List<GPSDataEntity> result = gpsDataService.getLast100Positions(imei);
        return ResponseEntity.ok(result);
    }

    /**
     * Verifica si un IMEI tiene registros
     */
    @GetMapping("/exists/{imei}")
    public ResponseEntity<Map<String, Object>> checkImeiExists(@PathVariable String imei) {
        boolean exists = gpsDataService.existsByImei(imei);
        long count = exists ? gpsDataService.countByImei(imei) : 0;

        Map<String, Object> response = new HashMap<>();
        response.put("exists", exists);
        response.put("count", count);

        return ResponseEntity.ok(response);
    }

    /**
     * Obtiene estadísticas de un IMEI
     */
    @GetMapping("/stats/{imei}")
    public ResponseEntity<Map<String, Object>> getStats(@PathVariable String imei) {
        long count = gpsDataService.countByImei(imei);
        Optional<GPSDataEntity> lastPosition = gpsDataService.getLastPosition(imei);

        Map<String, Object> stats = new HashMap<>();
        stats.put("imei", imei);
        stats.put("totalRecords", count);
        stats.put("lastPosition", lastPosition.orElse(null));
        stats.put("hasData", count > 0);

        return ResponseEntity.ok(stats);
    }

    /**
     * Endpoint para guardar múltiples registros de una vez
     */
    @PostMapping("/batch")
    public ResponseEntity<Map<String, Object>> saveBatch(@RequestBody List<GPSData> gpsDataList) {
        log.info("Received batch of {} GPS records", gpsDataList.size());

        int saved = 0;
        int failed = 0;

        for (GPSData gpsData : gpsDataList) {
            try {
                gpsDataService.save(gpsData);
                saved++;
            } catch (Exception e) {
                log.error("Failed to save GPS data for IMEI: {}", gpsData.getImei(), e);
                failed++;
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("saved", saved);
        result.put("failed", failed);
        result.put("total", gpsDataList.size());

        return ResponseEntity.ok(result);
    }
}
