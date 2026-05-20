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

    @Value("${google.client-id}")
    private String googleClientId;

    @Value("${github.client-id}")
    private String githubClientId;

    @Value("${github.client-secret}")
    private String githubClientSecret;

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
    public ResponseEntity<?> actualizarUsuario(@PathVariable UUID id, @RequestBody Usuario usuario) {
        try {
            Usuario usuarioActualizado = usuarioService.actualizarUsuario(id, usuario);
            return ResponseEntity.ok(usuarioActualizado);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminarUsuario(@PathVariable UUID id) {
        usuarioService.eliminarUsuario(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/contrasena/{id}")
    public ResponseEntity<Void> cambiarContrasena(@PathVariable UUID id, @RequestBody Map<String, String> body) {
        String nuevaContrasena = body.get("nuevaContrasena");
        if (nuevaContrasena == null || nuevaContrasena.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        try {
            usuarioService.cambiarContrasena(id, nuevaContrasena);
            return ResponseEntity.ok().build();
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
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

    @GetMapping("/exists/usuario/{usuario}")
    public ResponseEntity<Map<String, Boolean>> existeUsuario(@PathVariable String usuario) {
        return ResponseEntity.ok(Map.of("exists", usuarioService.existeUsuario(usuario)));
    }

    @GetMapping("/exists/correo/{correo}")
    public ResponseEntity<Map<String, Boolean>> existeCorreo(@PathVariable String correo) {
        return ResponseEntity.ok(Map.of("exists", usuarioService.existeCorreo(correo)));
    }

    @PostMapping("/google")
    public ResponseEntity<?> loginConGoogle(@RequestBody Map<String, String> body) {

        String accessToken = body.get("tokenGoogle");

        if (accessToken == null || accessToken.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Token de Google requerido"));
        }

        try {
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

            Map<String, Object> googleData = googleResponse.getBody();
            String correoVerificado = (String) googleData.get("email");
            String imagenVerificada = (String) googleData.get("picture");

            String nombreVerificado = (String) googleData.getOrDefault("given_name", googleData.get("name"));
            String apellidoVerificado = (String) googleData.getOrDefault("family_name", "");

            String telefonoRecibido = body.getOrDefault("telefono", "");

            Usuario usuario = usuarioService.obtenerPorCorreo(correoVerificado)
                    .orElseGet(() -> {

                        String base = (nombreVerificado + "_" + apellidoVerificado)
                                .toLowerCase()
                                .replaceAll("[^a-z0-9_]", "_")
                                .replaceAll("_+", "_")
                                .replaceAll("^_|_$", "");

                        String usernameUnico = base;
                        if (usuarioService.existeUsuario(usernameUnico)) {
                            usernameUnico = base + "_" + (int) (Math.random() * 9000 + 1000);
                        }

                        Usuario nuevo = new Usuario();
                        nuevo.setUsuario(usernameUnico);
                        nuevo.setCorreo(correoVerificado);
                        nuevo.setNombre(nombreVerificado);
                        nuevo.setApellido(apellidoVerificado);
                        nuevo.setTelefono(telefonoRecibido.isBlank() ? null : telefonoRecibido);
                        nuevo.setContrasena(UUID.randomUUID().toString());
                        nuevo.setRol("USER");
                        nuevo.setActivo(true);
                        nuevo.setImagenUrl(imagenVerificada);
                        return usuarioService.crearUsuario(nuevo);
                    });

            String token = jwtUtil.generarToken(usuario.getUsuario(), usuario.getRol());

            boolean perfilCompleto = usuario.getTelefono() != null && !usuario.getTelefono().isBlank();

            return ResponseEntity.ok(Map.of(
                    "token", token,
                    "usuario", usuario.getUsuario(),
                    "rol", usuario.getRol(),
                    "perfilCompleto", perfilCompleto));

        } catch (Exception e) {
            System.out.println("Error verificando token Google: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "No se pudo verificar la identidad con Google"));
        }
    }

    @PostMapping("/github")
    public ResponseEntity<?> loginConGithub(@RequestBody Map<String, String> body) {

        String accessToken = body.get("tokenGithub");

        if (accessToken == null || accessToken.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Token de GitHub requerido"));
        }

        try {
            RestTemplate restTemplate = new RestTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "Bearer " + accessToken);
            headers.set("Accept", "application/vnd.github+json");
            HttpEntity<Void> entity = new HttpEntity<>(headers);

            ResponseEntity<Map> githubResponse = restTemplate.exchange(
                    "https://api.github.com/user",
                    HttpMethod.GET,
                    entity,
                    Map.class);

            if (!githubResponse.getStatusCode().is2xxSuccessful()
                    || githubResponse.getBody() == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Token de GitHub inválido"));
            }

            Map<String, Object> githubData = githubResponse.getBody();

            String correo = (String) githubData.get("email");
            if (correo == null) {
                ResponseEntity<List> emailsResponse = restTemplate.exchange(
                        "https://api.github.com/user/emails",
                        HttpMethod.GET,
                        entity,
                        List.class);

                correo = ((List<Map<String, Object>>) emailsResponse.getBody())
                        .stream()
                        .filter(e -> Boolean.TRUE.equals(e.get("primary"))
                                && Boolean.TRUE.equals(e.get("verified")))
                        .map(e -> (String) e.get("email"))
                        .findFirst()
                        .orElse(null);
            }

            if (correo == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "No se pudo obtener el email de GitHub"));
            }

            String loginGithub = (String) githubData.get("login");
            String imagenVerificada = (String) githubData.get("avatar_url");
            final String correoFinal = correo;

            Usuario usuario = usuarioService.obtenerPorCorreo(correoFinal)
                    .orElseGet(() -> {
                        String base = loginGithub
                                .toLowerCase()
                                .replaceAll("[^a-z0-9_]", "");

                        if (base.isBlank())
                            base = "github_user";

                        String usernameUnico = base;
                        if (usuarioService.existeUsuario(usernameUnico)) {
                            usernameUnico = base + "_" + (int) (Math.random() * 9000 + 1000);
                        }

                        Usuario nuevo = new Usuario();
                        nuevo.setUsuario(usernameUnico);
                        nuevo.setCorreo(correoFinal);
                        nuevo.setContrasena(UUID.randomUUID().toString());
                        nuevo.setRol("USER");
                        nuevo.setActivo(true);
                        nuevo.setImagenUrl(imagenVerificada);
                        return usuarioService.crearUsuario(nuevo);
                    });

            String token = jwtUtil.generarToken(usuario.getUsuario(), usuario.getRol());

            return ResponseEntity.ok(Map.of(
                    "token", token,
                    "usuario", usuario.getUsuario(),
                    "rol", usuario.getRol()));

        } catch (Exception e) {
            System.out.println("Error verificando token GitHub: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "No se pudo verificar la identidad con GitHub"));
        }
    }

    @PostMapping("/github/callback")
    public ResponseEntity<?> githubCallback(@RequestBody Map<String, String> body) {
        String code = body.get("code");

        try {
            RestTemplate restTemplate = new RestTemplate();

            HttpHeaders headers = new HttpHeaders();
            headers.set("Accept", "application/json");
            headers.set("Content-Type", "application/json");

            Map<String, String> tokenRequest = Map.of(
                    "client_id", githubClientId,
                    "client_secret", githubClientSecret,
                    "code", code);

            ResponseEntity<Map> tokenResponse = restTemplate.exchange(
                    "https://github.com/login/oauth/access_token",
                    HttpMethod.POST,
                    new HttpEntity<>(tokenRequest, headers),
                    Map.class);

            if (tokenResponse.getBody() == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Respuesta vacía de GitHub"));
            }

            Object errorObj = tokenResponse.getBody().get("error");
            if (errorObj != null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "GitHub rechazó el code: " + errorObj));
            }

            String accessToken = (String) tokenResponse.getBody().get("access_token");

            if (accessToken == null || accessToken.isBlank()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "No se pudo obtener access_token de GitHub"));
            }

            return loginConGithub(Map.of("tokenGithub", accessToken));

        } catch (Exception e) {
            System.out.println("Error en callback GitHub: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Error en callback de GitHub"));
        }
    }

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
}