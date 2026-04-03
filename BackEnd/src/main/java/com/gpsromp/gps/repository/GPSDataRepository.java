package com.gpsromp.gps.repository;

import com.gpsromp.gps.model.GPSDataEntity;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface GPSDataRepository extends MongoRepository<GPSDataEntity, String> {

    // Última posición por IMEI
    Optional<GPSDataEntity> findFirstByImeiOrderByTimestampDesc(String imei);

    // Histórico por IMEI y rango de fechas
    List<GPSDataEntity> findByImeiAndCreatedAtBetweenOrderByCreatedAtDesc(
            String imei,
            LocalDateTime start,
            LocalDateTime end
    );

    // Últimas N posiciones por IMEI
    List<GPSDataEntity> findTop100ByImeiOrderByCreatedAtDesc(String imei);

    // Verificar si existe un IMEI
    boolean existsByImei(String imei);

    // Contar registros por IMEI
    long countByImei(String imei);

    // Todas las posiciones de hoy
    List<GPSDataEntity> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end);
}
