package com.gpsromp.usuario.controller;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.gpsromp.config.JwtUtil;
import com.gpsromp.usuario.model.Usuario;
import com.gpsromp.usuario.service.UsuarioService;
import com.gpsromp.vehiculo.model.Vehiculo;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/usuario")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class UsuarioController {

    private final UsuarioService usuarioService;
    @Autowired
    private AuthenticationManager authenticationManager;
    @Autowired
    private JwtUtil jwtUtil;

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
            return ResponseEntity.badRequest().body(Map.of("error", "El nombre de usuario ya existe"));
        }
        if (usuarioService.existeCorreo(usuario.getCorreo())) {
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

    @PatchMapping("/cambiar-estado/{id}")
    public ResponseEntity<Void> cambiarEstadoUsuario(@PathVariable UUID id) {
        try {
            usuarioService.cambiarEstado(id);
            return ResponseEntity.ok().build();
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/vehiculos/{usuarioId}")
    public ResponseEntity<List<Vehiculo>> obtenerVehiculosPorUsuario(@PathVariable UUID usuarioId) {
        return usuarioService.ObtenerUsuariosPorId(usuarioId)
                .map(usuario -> ResponseEntity.ok(usuario.getVehiculos()))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> credenciales) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            credenciales.get("usuario"),
                            credenciales.get("contrasena")
                    )
            );
        } catch (BadCredentialsException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Credenciales inválidas"));
        }

        var usuario = usuarioService.obtenerUsuariosPorUsuario(credenciales.get("usuario")).get();
        String token = jwtUtil.generarToken(usuario.getUsuario(), usuario.getRol());

        return ResponseEntity.ok(Map.of(
                "token", token,
                "usuario", usuario.getUsuario(),
                "rol", usuario.getRol()
        ));
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
