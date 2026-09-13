package com.gpsromp.gps.controller;

import java.time.Instant;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.gpsromp.common.exception.RecursoNoEncontradoException;
import com.gpsromp.gps.model.GPSData;
import com.gpsromp.gps.service.GPSDataService;

import lombok.RequiredArgsConstructor;

/**
 * Datos GPS.
 *
 * POST /gps sigue siendo público porque es la vía de ingesta del Servidor-TCP,
 * que hoy publica sin credenciales. Cerrarlo exige tocar ese módulo, que queda
 * fuera del alcance de esta tarea. Está anotado como pendiente en DIAGNOSTICO.md.
 *
 * GET de la última posición sí se restringe: antes cualquier cuenta autenticada
 * podía consultar la posición de cualquier IMEI, lo que permitía rastrear flotas
 * ajenas con solo conocer el número.
 */
@RestController
@RequestMapping("/gps")
@RequiredArgsConstructor
public class GPSDataController {

    private final GPSDataService gpsDataService;

    /** Ingesta desde el Servidor-TCP. Pública. */
    @PostMapping
    public ResponseEntity<GPSData> guardarDatosGPS(@RequestBody GPSData gpsData) {
        return ResponseEntity.ok(gpsDataService.save(gpsData));
    }

    /**
     * Historial de recorrido. El query del repositorio existía desde el
     * principio pero no había ningún endpoint que lo expusiera.
     */
    @GetMapping("/historial/{imei}")
    @PreAuthorize("hasRole('ADMIN') or @seguridad.esMiImei(#imei, authentication)")
    public ResponseEntity<List<GPSData>> historial(
            @PathVariable String imei,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant desde,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant hasta) {

        if (desde.isAfter(hasta)) {
            throw new IllegalArgumentException("'desde' debe ser anterior a 'hasta'");
        }
        return ResponseEntity.ok(gpsDataService.getHistorial(imei, desde, hasta));
    }

    @GetMapping("/ultima-posicion/{imei}")
    @PreAuthorize("hasRole('ADMIN') or @seguridad.esMiImei(#imei, authentication)")
    public ResponseEntity<GPSData> obtenerUltimaPosicionPorImei(@PathVariable String imei) {
        return ResponseEntity.ok(gpsDataService.getLastPosition(imei)
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "No hay posiciones registradas para el IMEI " + imei)));
    }
}
