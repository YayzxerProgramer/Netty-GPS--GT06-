package com.gpsromp.vehiculo.model;

import java.time.LocalDateTime;
import java.util.UUID;
import java.io.Serializable;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.*;

@Entity
@Table(name = "Vehiculos")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder

public class Vehiculo implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @NonNull
    @Column(unique = true, nullable = false, length = 6)
    private String placa;

    @Column(unique = true, nullable = true)
    private String imei;

    @NonNull
    private String modelo;

    @NonNull
    private String tipo;

    @Builder.Default
    private Boolean activo = true;

    @Column(name = "usuario_id")
    private UUID id_usuario;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime creadoEn;

    @UpdateTimestamp
    private LocalDateTime actualizadoEn;

    public enum tipo {
        MOTO,
        CARRO
    }

}
