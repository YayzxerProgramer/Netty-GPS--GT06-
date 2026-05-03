package com.gpsromp.usuario.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.gpsromp.usuario.model.Usuario;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UsuarioRepository extends JpaRepository<Usuario, UUID> {

    Optional<Usuario> findByUsuario(String usuario);

    Optional<Usuario> findByCorreo(String correo);

    boolean existsByUsuario(String usuario);

    boolean existsByCorreo(String correo);
}
