package com.gpsromp.usuario.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.gpsromp.usuario.model.Usuario;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UsuarioRepository extends JpaRepository<Usuario, UUID> {

    Optional<Usuario> buscarPorUsuario(String usuario);

    Optional<Usuario> buscarPorCorreo(String correo);

    boolean existeUsuario(String usuario);

    boolean existeCorreo(String correo);
}
