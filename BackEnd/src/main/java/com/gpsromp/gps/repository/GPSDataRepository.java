package com.gpsromp.gps.repository;

import com.gpsromp.gps.model.GPSData;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface GPSDataRepository extends MongoRepository<GPSData, String> {
    // Última posición filtrando por IMEI (cuando haya múltiples dispositivos)
    Optional<GPSData> findFirstByImeiOrderByRegistradoEnDesc(String imei);

    // Historial por rango de fechas
    List<GPSData> findByImeiAndRegistradoEnBetweenOrderByRegistradoEnDesc(String imei, Instant desde, Instant hasta);
}
