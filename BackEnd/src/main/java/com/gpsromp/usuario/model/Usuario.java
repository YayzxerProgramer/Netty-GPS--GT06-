package com.gpsromp.usuario.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;
import java.util.UUID;
import java.io.Serializable;

@Entity
@Table(name = "Usuarios")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Usuario implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private String nombre;

    private String apellido;

    @Column(unique = true, nullable = false)
    private String usuario;

    /**
     * Hash BCrypt. @JsonIgnore es defensa en profundidad: la API responde con
     * UsuarioResponse, que ni siquiera declara este campo, pero si alguien
     * serializa la entidad por error el hash no sale.
     */
    @JsonIgnore
    private String contrasena;

    @Column(unique = true, nullable = false)
    private String correo;

    private String telefono;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Rol rol = Rol.USER;

    @Column(nullable = false)
    private Boolean activo = true;

    private String imagenUrl;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime creadoEn;

    @UpdateTimestamp
    private LocalDateTime actualizadoEn;
}
