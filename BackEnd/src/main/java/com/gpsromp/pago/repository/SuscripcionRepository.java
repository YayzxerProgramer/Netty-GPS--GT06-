package com.gpsromp.pago.repository;

import com.gpsromp.pago.model.Suscripcion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SuscripcionRepository extends JpaRepository<Suscripcion, UUID> {
    Optional<Suscripcion> findByImei(String imei);
    List<Suscripcion> findByUsuarioId(UUID usuarioId);
}
