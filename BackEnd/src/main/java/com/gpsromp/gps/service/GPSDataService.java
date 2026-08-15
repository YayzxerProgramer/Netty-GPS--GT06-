package com.gpsromp.gps.service;

import com.gpsromp.gps.model.GPSData;
import com.gpsromp.gps.repository.GPSDataRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.Instant;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class GPSDataService {

    private final GPSDataRepository repository;
    private final SimpMessagingTemplate messagingTemplate;
    private final RedisTemplate<String, Object> redisTemplate;

    private static final String REDIS_PREFIX_GPS = "gps:posicion:";

    /**
     * Guarda un nuevo registro GPS en MongoDB y actualiza la última posición en Redis
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
                .registradoEn(Instant.now())
                .creadosEn(Instant.now())
                .build();

        messagingTemplate.convertAndSend("/socket/gps/" + entity.getImei(), entity);

        GPSData savedEntity = repository.save(entity);

        // Guardar última posición en Redis (Clave: gps:posicion:<IMEI>)
        try {
            redisTemplate.opsForValue().set(REDIS_PREFIX_GPS + savedEntity.getImei(), savedEntity);
            log.info("Posición GPS guardada exitosamente en Redis para IMEI: {}", savedEntity.getImei());
        } catch (Exception e) {
            log.error("No se pudo guardar la posición GPS en Redis: {}", e.getMessage());
        }

        return savedEntity;
    }

    /**
     * Obtiene la última posición conocida del GPS (Primero consulta Redis, si no existe consulta MongoDB)
     */
    public Optional<GPSData> getLastPosition(String imei) {
        try {
            Object cached = redisTemplate.opsForValue().get(REDIS_PREFIX_GPS + imei);
            if (cached instanceof GPSData) {
                log.info("Última posición obtenida desde Redis para IMEI: {}", imei);
                return Optional.of((GPSData) cached);
            }
        } catch (Exception e) {
            log.error("Error consultando Redis para IMEI {}: {}", imei, e.getMessage());
        }

        log.info("Última posición obtenida desde MongoDB para IMEI: {}", imei);
        Optional<GPSData> dbResult = repository.findFirstByImeiOrderByRegistradoEnDesc(imei);

        // Si se encontró en MongoDB pero no estaba en Redis, poblar Redis
        dbResult.ifPresent(gps -> {
            try {
                redisTemplate.opsForValue().set(REDIS_PREFIX_GPS + imei, gps);
            } catch (Exception ignored) {
            }
        });

        return dbResult;
    }
}
