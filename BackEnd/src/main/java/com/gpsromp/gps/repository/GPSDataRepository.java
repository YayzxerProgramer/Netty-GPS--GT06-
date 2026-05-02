package com.gpsromp.gps.repository;

import com.gpsromp.gps.model.GPSDataEntity;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface GPSDataRepository extends MongoRepository<GPSDataEntity, String> {
    // Última posición filtrando por IMEI (cuando haya múltiples dispositivos)
    Optional<GPSDataEntity> findFirstByImeiOrderByRegistradoEnDesc(String imei);

    // Historial por rango de fechas
    List<GPSDataEntity> findByImeiAndRegistradoEnBetweenOrderByRegistradoEnDesc(String imei, Instant desde, Instant hasta);
}
