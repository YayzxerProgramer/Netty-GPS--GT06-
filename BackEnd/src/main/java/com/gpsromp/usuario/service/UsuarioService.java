package com.gpsromp.usuario.service;

import com.gpsromp.usuario.model.Usuario;
import com.gpsromp.usuario.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

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
        usuario.setContraseña(passwordEncoder.encode(usuario.getContraseña()));
        return usuarioRepository.save(usuario);
    }

    @Transactional
    public Usuario actualizarUsuario(UUID id, Usuario usuarioDetalles) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        if (usuarioDetalles.getUsuario() != null) {
            usuario.setUsuario(usuarioDetalles.getUsuario());
        }
        if (usuarioDetalles.getCorreo() != null) {
            usuario.setCorreo(usuarioDetalles.getCorreo());
        }
        if (usuarioDetalles.getContraseña() != null && !usuarioDetalles.getContraseña().isEmpty()) {
            usuario.setContraseña(passwordEncoder.encode(usuarioDetalles.getContraseña()));
        }
        if (usuarioDetalles.getRol() != null) {
            usuario.setRol(usuarioDetalles.getRol());
        }
        usuario.setActivo(usuarioDetalles.isActivo());

        return usuarioRepository.save(usuario);
    }

    @Transactional
    public void eliminarUsuario(UUID id) {
        usuarioRepository.deleteById(id);
    }

    @Transactional
    public void cambiarEstado(UUID id) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        usuario.setActivo(!usuario.isActivo());
        usuarioRepository.save(usuario);
    }

    public boolean login(String usuario, String contraseña) {
        return usuarioRepository.findByUsuario(usuario)
                .map(u -> u.isActivo() &&
                        passwordEncoder.matches(contraseña, u.getContraseña()))
                .orElse(false);
    }
}
