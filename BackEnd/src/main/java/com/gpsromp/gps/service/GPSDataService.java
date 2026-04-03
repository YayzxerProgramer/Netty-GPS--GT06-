package com.gpsromp.gps.service;

import com.gpsromp.Model.GPSData;
import com.gpsromp.gps.model.GPSDataEntity;
import com.gpsromp.gps.repository.GPSDataRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class GPSDataService {

    private final GPSDataRepository repository;
    private final RedisTemplate<String, Object> redisTemplate;

    private static final String CACHE_KEY_PREFIX = "gps::";
    private static final String LAST_POSITION_KEY = CACHE_KEY_PREFIX + "last:";
    private static final String HISTORY_KEY = CACHE_KEY_PREFIX + "history:";

    /**
     * Guarda un nuevo registro GPS en MongoDB e invalida la caché
     */
    public GPSDataEntity save(GPSData gpsData) {
        GPSDataEntity entity = GPSDataEntity.from(gpsData);
        GPSDataEntity saved = repository.save(entity);

        // Invalidar caché de última posición para este IMEI
        invalidateLastPositionCache(gpsData.getImei());

        log.debug("GPS data saved for IMEI: {}", gpsData.getImei());
        return saved;
    }

    /**
     * Obtiene la última posición conocida de un dispositivo por IMEI
     * Usa caché Redis para mejorar rendimiento
     */
    public Optional<GPSDataEntity> getLastPosition(String imei) {
        String cacheKey = LAST_POSITION_KEY + imei;

        // Intentar obtener de caché
        Object cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached instanceof GPSDataEntity) {
            log.debug("Cache hit for IMEI: {}", imei);
            return Optional.of((GPSDataEntity) cached);
        }

        // Si no está en caché, buscar en MongoDB
        log.debug("Cache miss for IMEI: {}, querying MongoDB", imei);
        Optional<GPSDataEntity> result = repository.findFirstByImeiOrderByTimestampDesc(imei);

        // Guardar en caché si existe
        result.ifPresent(entity ->
            redisTemplate.opsForValue().set(cacheKey, entity, 5, TimeUnit.MINUTES)
        );

        return result;
    }

    /**
     * Obtiene el histórico de posiciones para un dispositivo en un rango de fechas
     */
    public List<GPSDataEntity> getHistory(String imei, LocalDateTime start, LocalDateTime end) {
        String cacheKey = HISTORY_KEY + imei + ":" + start.toString() + ":" + end.toString();

        // Intentar obtener de caché
        Object cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached instanceof List) {
            log.debug("Cache hit for history: {} ({} to {})", imei, start, end);
            return (List<GPSDataEntity>) cached;
        }

        // Si no está en caché, buscar en MongoDB
        log.debug("Cache miss for history, querying MongoDB");
        List<GPSDataEntity> result = repository.findByImeiAndCreatedAtBetweenOrderByCreatedAtDesc(imei, start, end);

        // Guardar en caché por 10 minutos
        if (!result.isEmpty()) {
            redisTemplate.opsForValue().set(cacheKey, result, 10, TimeUnit.MINUTES);
        }

        return result;
    }

    /**
     * Obtiene las últimas 100 posiciones de un dispositivo
     */
    public List<GPSDataEntity> getLast100Positions(String imei) {
        return repository.findTop100ByImeiOrderByCreatedAtDesc(imei);
    }

    /**
     * Verifica si un IMEI existe en la base de datos
     */
    public boolean existsByImei(String imei) {
        return repository.existsByImei(imei);
    }

    /**
     * Cuenta el número de registros para un IMEI
     */
    public long countByImei(String imei) {
        return repository.countByImei(imei);
    }

    /**
     * Invalida la caché de última posición para un IMEI
     */
    private void invalidateLastPositionCache(String imei) {
        String cacheKey = LAST_POSITION_KEY + imei;
        redisTemplate.delete(cacheKey);
        log.debug("Invalidated cache for IMEI: {}", imei);
    }

    /**
     * Limpia toda la caché de GPS (útil para mantenimiento)
     */
    public void clearAllCache() {
        // Patrón para eliminar todas las keys de GPS
        var keys = redisTemplate.keys(LAST_POSITION_KEY + "*");
        if (keys != null && !keys.isEmpty()) {
            redisTemplate.delete(keys);
        }
        keys = redisTemplate.keys(HISTORY_KEY + "*");
        if (keys != null && !keys.isEmpty()) {
            redisTemplate.delete(keys);
        }
        log.info("GPS cache cleared");
    }
}
