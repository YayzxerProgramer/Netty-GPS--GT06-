package com.gpsromp.usuario.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import com.gpsromp.vehiculo.model.Vehiculo;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "Usuarios")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private String nombre;

    private String apellido;

    private String usuario;

    private String contrasena;

    private String correo;

    private String telefono;

    @Column(nullable = false)
    private String rol = "USER";

    private Boolean activo = true;

    private String imagenUrl;

    @OneToMany(mappedBy = "id_usuario", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Vehiculo> vehiculos;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime creadoEn;

    @UpdateTimestamp
    private LocalDateTime actualizadoEn;

    public enum Rol {
        ADMIN,
        USER,
        VIEWER
    }
}
