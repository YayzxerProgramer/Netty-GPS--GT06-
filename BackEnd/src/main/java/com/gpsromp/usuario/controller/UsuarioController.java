package com.gpsromp.usuario.controller;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
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
import org.springframework.web.client.RestTemplate;

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

    private String googleClientId = "426121822210-mjnojj5qmht0r8lmkfogfa7mc3ev4lrk.apps.googleusercontent.com";

    // ─────────────────────────────────────────────────────────────────────────
    // CRUD estándar
    // ─────────────────────────────────────────────────────────────────────────

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
        if (usuarioService.existeCorreo(usuario.getCorreo())) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "El email ya está registrado"));
        }
        Usuario nuevoUsuario = usuarioService.crearUsuario(usuario);
        return ResponseEntity.status(HttpStatus.CREATED).body(nuevoUsuario);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Usuario> actualizarUsuario(
            @PathVariable UUID id,
            @RequestBody Usuario detallesUsuario) {
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

    // ─────────────────────────────────────────────────────────────────────────
    // Autenticación
    // ─────────────────────────────────────────────────────────────────────────

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> credenciales) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            credenciales.get("usuario"),
                            credenciales.get("contrasena")));
        } catch (BadCredentialsException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Credenciales inválidas"));
        }

        var usuario = usuarioService.obtenerUsuariosPorUsuario(credenciales.get("usuario")).get();
        String token = jwtUtil.generarToken(usuario.getUsuario(), usuario.getRol());

        return ResponseEntity.ok(Map.of(
                "token", token,
                "usuario", usuario.getUsuario(),
                "rol", usuario.getRol()));
    }

    /**
     * Autenticación / registro mediante Google OAuth2.
     *
     * El frontend envía el access_token obtenido con useGoogleLogin().
     * Este endpoint lo verifica llamando a la API de userinfo de Google,
     * crea el usuario si no existe y devuelve el JWT propio de la app.
     */
    @PostMapping("/google")
    public ResponseEntity<?> loginConGoogle(@RequestBody Map<String, String> body) {

        String accessToken = body.get("tokenGoogle");

        if (accessToken == null || accessToken.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Token de Google requerido"));
        }

        try {
            // 1. Verificar el access_token consultando directamente a Google
            RestTemplate restTemplate = new RestTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "Bearer " + accessToken);
            HttpEntity<Void> entity = new HttpEntity<>(headers);

            ResponseEntity<Map> googleResponse = restTemplate.exchange(
                    "https://www.googleapis.com/oauth2/v3/userinfo",
                    HttpMethod.GET,
                    entity,
                    Map.class);

            if (!googleResponse.getStatusCode().is2xxSuccessful()
                    || googleResponse.getBody() == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Token de Google inválido"));
            }

            // 2. Extraer datos verificados del perfil de Google
            Map<String, Object> googleData = googleResponse.getBody();
            String correoVerificado = (String) googleData.get("email");
            String nombreVerificado = (String) googleData.get("name");
            String imagenVerificada = (String) googleData.get("picture");

            // 3. Buscar el usuario por correo; si no existe, crearlo automáticamente
            Usuario usuario = usuarioService.obtenerPorCorreo(correoVerificado)
                    .orElseGet(() -> {

                        // Generar un username único a partir del nombre de Google
                        String base = nombreVerificado
                                .toLowerCase()
                                .replace(" ", "_")
                                .replaceAll("[^a-z0-9_]", "");

                        String usernameUnico = base;
                        if (usuarioService.existeUsuario(usernameUnico)) {
                            usernameUnico = base + "_" + (int) (Math.random() * 9000 + 1000);
                        }

                        Usuario nuevo = new Usuario();
                        nuevo.setUsuario(usernameUnico);
                        nuevo.setCorreo(correoVerificado);
                        nuevo.setContrasena(UUID.randomUUID().toString()); // no se usa para login
                        nuevo.setRol("USER");
                        nuevo.setActivo(true);
                        nuevo.setImagenUrl(imagenVerificada);
                        return usuarioService.crearUsuario(nuevo);
                    });

            // 4. Generar y devolver el JWT propio de la aplicación
            String token = jwtUtil.generarToken(usuario.getUsuario(), usuario.getRol());

            return ResponseEntity.ok(Map.of(
                    "token", token,
                    "usuario", usuario.getUsuario(),
                    "rol", usuario.getRol()));

        } catch (Exception e) {
            System.out.println("Error verificando token Google: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "No se pudo verificar la identidad con Google"));
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Utilidades
    // ─────────────────────────────────────────────────────────────────────────

    @GetMapping("/exists/usuario/{usuario}")
    public ResponseEntity<Map<String, Boolean>> existeUsuario(@PathVariable String usuario) {
        return ResponseEntity.ok(Map.of("exists", usuarioService.existeUsuario(usuario)));
    }

    @GetMapping("/exists/correo/{correo}")
    public ResponseEntity<Map<String, Boolean>> existeCorreo(@PathVariable String correo) {
        return ResponseEntity.ok(Map.of("exists", usuarioService.existeCorreo(correo)));
    }
}