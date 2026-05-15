package com.gpsromp.usuario.service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.gpsromp.usuario.model.Usuario;
import com.gpsromp.usuario.repository.UsuarioRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    public List<Usuario> ObtenerUsuarios() {
        return usuarioRepository.findAll();
    }

    public Optional<Usuario> ObtenerUsuariosPorId(UUID id) {
        return usuarioRepository.findById(id);
    }

    public Optional<Usuario> obtenerUsuariosPorUsuario(String usuario) {
        return usuarioRepository.findByUsuario(usuario);
    }

    public boolean existeUsuario(String usuario) {
        return usuarioRepository.existsByUsuario(usuario);
    }

    public boolean existeCorreo(String correo) {
        return usuarioRepository.existsByCorreo(correo);
    }

    @Transactional
    public Usuario crearUsuario(Usuario usuario) {
        if (usuario.getRol() == null || usuario.getRol().isBlank()) {
            usuario.setRol("USER");
        }

        usuario.setContrasena(passwordEncoder.encode(usuario.getContrasena()));

        return usuarioRepository.save(usuario);
    }

    @Transactional
    public Usuario actualizarUsuario(UUID id, Usuario usuarioDetalles) {
        if (id != null) {
            Usuario usuario = usuarioRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

            usuario.setActivo(usuarioDetalles.getActivo());

            return usuarioRepository.save(usuario);
        } else {
            throw new RuntimeException("ID de usuario no proporcionado");
        }
    }

    @Transactional
    public void eliminarUsuario(UUID id) {
        usuarioRepository.deleteById(id);
    }

    @Transactional
    public void cambiarEstado(UUID id) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        usuario.setActivo(!usuario.getActivo());
        usuarioRepository.save(usuario);
    }

    public boolean login(String usuario, String contrasena) {
        return usuarioRepository.findByUsuario(usuario)
                .map(u -> u.getActivo() && u.getContrasena().equals(contrasena))
                .orElse(false);
    }
}
