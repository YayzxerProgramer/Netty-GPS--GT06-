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
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Cacheable(value = "usuarios")
    public List<Usuario> ObtenerUsuarios() {
        return usuarioRepository.findAll();
    }

    public Optional<Usuario> ObtenerUsuariosPorId(UUID id) {
        return usuarioRepository.findById(id);
    }

    public Optional<Usuario> obtenerUsuariosPorUsuario(String usuario) {
        return usuarioRepository.findByUsuario(usuario);
    }

    public Optional<Usuario> obtenerPorCorreo(String correo) {
        return usuarioRepository.findByCorreo(correo);
    }

    public boolean existeUsuario(String usuario) {
        return usuarioRepository.existsByUsuario(usuario);
    }

    public boolean existeCorreo(String correo) {
        return usuarioRepository.existsByCorreo(correo);
    }

    @Transactional
    @CacheEvict(value = "usuarios", allEntries = true)
    public Usuario crearUsuario(Usuario usuario) {
        if (usuario.getRol() == null || usuario.getRol().isBlank()) {
            usuario.setRol("USER");
        }
        usuario.setContrasena(passwordEncoder.encode(usuario.getContrasena()));
        return usuarioRepository.save(usuario);
    }

    @Transactional
    @CacheEvict(value = "usuarios", allEntries = true)
    public Usuario actualizarUsuario(UUID id, Usuario usuarioDetalles) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        if (usuarioDetalles.getNombre() != null)
            usuario.setNombre(usuarioDetalles.getNombre());

        if (usuarioDetalles.getApellido() != null)
            usuario.setApellido(usuarioDetalles.getApellido());

        if (usuarioDetalles.getUsuario() != null)
            usuario.setUsuario(usuarioDetalles.getUsuario());

        if (usuarioDetalles.getCorreo() != null)
            usuario.setCorreo(usuarioDetalles.getCorreo());

        if (usuarioDetalles.getTelefono() != null)
            usuario.setTelefono(usuarioDetalles.getTelefono());

        if (usuarioDetalles.getActivo() != null)
            usuario.setActivo(usuarioDetalles.getActivo());

        if (usuarioDetalles.getImagenUrl() != null)
            usuario.setImagenUrl(usuarioDetalles.getImagenUrl());

        return usuarioRepository.save(usuario);
    }

    @Transactional
    @CacheEvict(value = "usuarios", allEntries = true)
    public void eliminarUsuario(UUID id) {
        usuarioRepository.deleteById(id);
    }

    @Transactional
    @CacheEvict(value = "usuarios", allEntries = true)
    public void cambiarEstado(UUID id) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        usuario.setActivo(!usuario.getActivo());
        usuarioRepository.save(usuario);
    }

    @Transactional
    public void cambiarContrasena(UUID id, String nuevaContrasena) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        usuario.setContrasena(passwordEncoder.encode(nuevaContrasena));
        usuarioRepository.save(usuario);
    }

    public boolean login(String usuario, String contrasena) {
        return usuarioRepository.findByUsuario(usuario)
                .map(u -> u.getActivo() && passwordEncoder.matches(contrasena, u.getContrasena()))
                .orElse(false);
    }
}