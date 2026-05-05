package com.gpsromp.gps.service;

import com.gpsromp.gps.model.GPSData;
import com.gpsromp.gps.repository.GPSDataRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class GPSDataService {

    private final GPSDataRepository repository;

    /**
     * Guarda un nuevo registro GPS en MongoDB
     */
    public GPSData save(GPSData gpsData) {
    GPSData entity = GPSData.builder()
            .imei(gpsData.getImei())
            .latitud(gpsData.getLatitud())
            .longitud(gpsData.getLongitud())
            .velocidad(gpsData.getVelocidad())
            .gpsValido(gpsData.isGpsValido())
            .acc(gpsData.isAcc())
            .corteMotor(gpsData.isCorteMotor())
            .creadosEn(Instant.now())
            .build();

    return repository.save(entity);
}

    /**
     * Obtiene la última posición conocida del GPS
     */
    public Optional<GPSData> getLastPosition(String imei) {
        return repository.findFirstByImeiOrderByRegistradoEnDesc(imei);
    }
}
