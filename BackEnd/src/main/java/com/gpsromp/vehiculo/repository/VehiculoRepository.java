package com.gpsromp.vehiculo.repository;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.gpsromp.vehiculo.model.*;
import java.util.Optional;

@Repository
public interface VehiculoRepository extends JpaRepository<Vehiculo, UUID> {

    Optional<Vehiculo> findByPlaca(String placa);

    Optional<Vehiculo> findByImei(String imei);

    boolean existsByPlaca(String placa);

}
