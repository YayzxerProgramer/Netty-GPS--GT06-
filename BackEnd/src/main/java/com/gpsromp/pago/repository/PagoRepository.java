package com.gpsromp.pago.repository;

import com.gpsromp.pago.model.Pago;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PagoRepository extends JpaRepository<Pago, UUID> {
    Optional<Pago> findByReferenciaWompi(String referenciaWompi);
    Optional<Pago> findByTransaccionIdWompi(String transaccionIdWompi);
}
