package com.gpsromp.usuario.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.gpsromp.usuario.model.Usuario;
import com.gpsromp.usuario.service.UsuarioService;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/usuario")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class UsuarioController {

    private final UsuarioService usuarioService;

    @GetMapping
    public ResponseEntity<List<Usuario>> obtenerTodosUsuarios() {
        return ResponseEntity.ok(usuarioService.ObtenerUsuarios());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Usuario> obtenerUsuariosId(@PathVariable UUID id) {
        return usuarioService.ObtenerUsuariosPorId(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/usuario/{usuario}")
    public ResponseEntity<Usuario> obtenerUsuariosPorUsuario(@PathVariable String usuario) {
        return usuarioService.obtenerUsuariosPorUsuario(usuario)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> crearUsuario(@RequestBody Usuario usuario) {
        if (usuarioService.existeUsuario(usuario.getUsuario())) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "El nombre de usuario ya existe"));
        }
        if (usuario.getCorreo() != null && usuarioService.existeCorreo(usuario.getCorreo())) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "El email ya está registrado"));
        }

        Usuario nuevoUsuario = usuarioService.crearUsuario(usuario);
        return ResponseEntity.status(HttpStatus.CREATED).body(nuevoUsuario);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Usuario> actualizarUsuario(@PathVariable UUID id, @RequestBody Usuario detallesUsuario) {
        try {
            Usuario actualizado = usuarioService.actualizarUsuario(id, detallesUsuario);
            return ResponseEntity.ok(actualizado);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminarUsuario(@PathVariable UUID id) {
        usuarioService.eliminarUsuario(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/cambiar-estado")
    public ResponseEntity<Void> cambiarEstadoUsuario(@PathVariable UUID id) {
        try {
            usuarioService.cambiarEstado(id);
            return ResponseEntity.ok().build();
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> credenciales) {
        String usuario = credenciales.get("usuario");
        String contrasena = credenciales.get("contrasena");

        if (usuario == null || contrasena == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Usuario y contraseña son requeridos"));
        }

        if (usuarioService.login(usuario, contrasena)) {
            return usuarioService.obtenerUsuariosPorUsuario(usuario)
                    .map(user -> ResponseEntity.ok(Map.of(
                            "success", true,
                            "user", user
                    )))
                    .orElse(ResponseEntity.internalServerError().build());
        }

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("error", "Credenciales inválidas"));
    }

    @GetMapping("/exists/usuario/{usuario}")
    public ResponseEntity<Map<String, Boolean>> existeUsuario(@PathVariable String usuario) {
        return ResponseEntity.ok(Map.of("exists", usuarioService.existeUsuario(usuario)));
    }

    @GetMapping("/exists/correo/{correo}")
    public ResponseEntity<Map<String, Boolean>> existeCorreo(@PathVariable String correo) {
        return ResponseEntity.ok(Map.of("exists", usuarioService.existeCorreo(correo)));
    }
}
