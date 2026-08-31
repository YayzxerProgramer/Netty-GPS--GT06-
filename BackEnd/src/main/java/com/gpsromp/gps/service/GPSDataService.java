package com.gpsromp.gps.service;

import com.gpsromp.common.exception.RecursoNoEncontradoException;
import com.gpsromp.gps.model.GPSData;
import com.gpsromp.gps.repository.GPSDataRepository;
import com.gpsromp.vehiculo.repository.VehiculoRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class GPSDataService {

    private final GPSDataRepository repository;
    private final VehiculoRepository vehiculoRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final RedisTemplate<String, Object> redisTemplate;

    private static final String REDIS_PREFIX_GPS = "gps:posicion:";

    /**
     * Persiste una posición, actualiza la caché y la difunde por WebSocket.
     *
     * DOS ARREGLOS:
     *
     * 1. ORDEN. Antes se publicaba por WebSocket ANTES de guardar en Mongo, así
     *    que si el guardado fallaba los clientes ya habían pintado una posición
     *    que no existía en ningún sitio. Ahora se persiste primero y solo se
     *    difunde lo que quedó guardado de verdad.
     *
     * 2. HORA DEL DISPOSITIVO. Antes se pisaba registradoEn con Instant.now(),
     *    descartando la hora real del fix GPS que envía el GT06. El histórico
     *    reflejaba la hora de ingesta, de modo que con reintentos o con el
     *    buffer del propio dispositivo las trazas quedaban desordenadas. Ahora
     *    se respeta la hora recibida y solo se recurre a la actual si no viene.
     */
    public GPSData save(GPSData gpsData) {

        String imei = gpsData.getImei();

        if (imei == null || imei.isBlank()) {
            throw new IllegalArgumentException("La posición no trae IMEI");
        }

        // El IMEI debe corresponder a un vehículo registrado.
        //
        // La clave de ingesta impide que un tercero publique posiciones, pero no
        // impide que un dispositivo legítimo —o un error de configuración— llene
        // MongoDB con IMEI que no existen en el sistema. Además, esas posiciones
        // se difundían por WebSocket a un topic que nadie puede escuchar, porque
        // la autorización exige ser propietario de un vehículo con ese IMEI.
        if (!vehiculoRepository.existsByImei(imei)) {
            log.warn("Posición descartada: el IMEI {} no corresponde a ningún vehículo registrado", imei);
            throw new RecursoNoEncontradoException(
                    "No hay ningún vehículo registrado con el IMEI " + imei);
        }

        Instant momentoFix = gpsData.getRegistradoEn() != null
                ? gpsData.getRegistradoEn()
                : Instant.now();

        GPSData entidad = GPSData.builder()
                .imei(gpsData.getImei())
                .latitud(gpsData.getLatitud())
                .longitud(gpsData.getLongitud())
                .velocidad(gpsData.getVelocidad())
                .gpsValido(gpsData.isGpsValido())
                .acc(gpsData.isAcc())
                .corteMotor(gpsData.isCorteMotor())
                .registradoEn(momentoFix)
                .creadosEn(Instant.now())
                .build();

        GPSData guardada = repository.save(entidad);

        try {
            redisTemplate.opsForValue().set(REDIS_PREFIX_GPS + guardada.getImei(), guardada);
        } catch (Exception e) {
            // La caché es opcional: si Redis falla, la posición ya está en Mongo.
            log.warn("No se pudo cachear la posición de {}: {}", guardada.getImei(), e.getMessage());
        }

        messagingTemplate.convertAndSend("/socket/gps/" + guardada.getImei(), guardada);

        log.debug("Posición de {} guardada y difundida", guardada.getImei());
        return guardada;
    }

    /** Última posición conocida: primero Redis, si no MongoDB. */
    public Optional<GPSData> getLastPosition(String imei) {
        try {
            Object cacheada = redisTemplate.opsForValue().get(REDIS_PREFIX_GPS + imei);
            if (cacheada instanceof GPSData posicion) {
                return Optional.of(posicion);
            }
        } catch (Exception e) {
            log.warn("Error consultando Redis para {}: {}", imei, e.getMessage());
        }

        Optional<GPSData> enBd = repository.findFirstByImeiOrderByRegistradoEnDesc(imei);

        enBd.ifPresent(gps -> {
            try {
                redisTemplate.opsForValue().set(REDIS_PREFIX_GPS + imei, gps);
            } catch (Exception e) {
                log.warn("No se pudo repoblar la caché de {}: {}", imei, e.getMessage());
            }
        });

        return enBd;
    }

    /**
     * Historial de recorrido en un rango de fechas.
     *
     * El método del repositorio existía desde el principio pero no lo llamaba
     * nadie: no había servicio ni endpoint que lo expusiera.
     */
    public List<GPSData> getHistorial(String imei, Instant desde, Instant hasta) {
        return repository.findByImeiAndRegistradoEnBetweenOrderByRegistradoEnDesc(imei, desde, hasta);
    }
}
