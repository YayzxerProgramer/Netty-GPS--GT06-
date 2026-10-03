package com.gpsromp.pago.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "Pagos")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Pago implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private UUID usuarioId;

    @Column(unique = true, nullable = false)
    private String referenciaWompi;

    private String transaccionIdWompi;

    private BigDecimal monto;

    private String moneda; // COP

    private String estado; // APPROVED, DECLINED, VOIDED, ERROR

    private String metodoPago; // CARD, NEQUI, PSE, BANCOLOMBIA

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime creadoEn;
}
