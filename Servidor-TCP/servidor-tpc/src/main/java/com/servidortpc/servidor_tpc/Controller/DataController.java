package com.servidortpc.servidor_tpc.Controller;

import java.util.Collection;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.servidortpc.servidor_tpc.Model.GPSData;
import com.servidortpc.servidor_tpc.Service.GpsDataService;

/**
 * Diagnóstico local del servidor TCP.
 *
 * ARREGLO: la versión anterior hacía un GET contra http://localhost:8081/gps,
 * endpoint que en el BackEnd solo acepta POST, así que devolvía 405 siempre.
 * Además ignoraba por completo el GpsDataService local, que es justamente donde
 * está el último dato conocido.
 *
 * Ahora responde desde la memoria de este proceso, sin llamar al backend.
 */
@RestController
@RequestMapping("/data")
public class DataController {

    private final GpsDataService gpsDataService;

    public DataController(GpsDataService gpsDataService) {
        this.gpsDataService = gpsDataService;
    }

    /** Última posición de cada dispositivo visto desde que arrancó el proceso. */
    @GetMapping("/ubicaciones")
    public ResponseEntity<Collection<GPSData>> todas() {
        return ResponseEntity.ok(gpsDataService.obtenerTodas());
    }

    @GetMapping("/ubicacion/{imei}")
    public ResponseEntity<GPSData> porImei(@PathVariable String imei) {
        return gpsDataService.obtenerPorImei(imei)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/estado")
    public ResponseEntity<Map<String, Object>> estado() {
        return ResponseEntity.ok(Map.of(
                "dispositivosVistos", gpsDataService.dispositivosConectados()));
    }
}
