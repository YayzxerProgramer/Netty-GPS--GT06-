package com.gpsromp.Config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.gpsromp.usuario.model.Rol;
import com.gpsromp.usuario.model.Usuario;
import com.gpsromp.usuario.repository.UsuarioRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Crea el primer administrador al arrancar.
 *
 * POR QUÉ EXISTE: RegistroRequest eliminó el campo rol del registro público, que
 * era la única vía por la que se podía llegar a crear un ADMIN (mandando
 * {"rol":"ADMIN"} sin autenticarse). Sin este sembrador el sistema se quedaría
 * sin acceso administrativo y sin forma de recuperarlo salvo tocando la base de
 * datos a mano.
 *
 * COMPORTAMIENTO:
 *  - Si ya existe algún ADMIN, no hace nada.
 *  - Si no existe ninguno y ADMIN_USUARIO / ADMIN_CONTRASENA están definidos:
 *      · si el usuario ya existe, lo promueve a ADMIN y lo activa;
 *      · si no existe, lo crea.
 *  - Si faltan las variables, NO revienta el arranque: deja un aviso en el log.
 *
 * USO:
 *   PowerShell:  $env:ADMIN_USUARIO="admin"; $env:ADMIN_CONTRASENA="..."; ./mvnw spring-boot:run
 *   Bash:        ADMIN_USUARIO=admin ADMIN_CONTRASENA=... ./mvnw spring-boot:run
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class SembradorAdmin implements CommandLineRunner {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${admin.usuario:${ADMIN_USUARIO:}}")
    private String adminUsuario;

    @Value("${admin.contrasena:${ADMIN_CONTRASENA:}}")
    private String adminContrasena;

    @Value("${admin.correo:${ADMIN_CORREO:admin@rompgps.local}}")
    private String adminCorreo;

    @Override
    @Transactional
    public void run(String... args) {

        if (usuarioRepository.existsByRol(Rol.ADMIN)) {
            log.info("Ya existe al menos un administrador. El sembrador no hace nada.");
            return;
        }

        if (adminUsuario == null || adminUsuario.isBlank()
                || adminContrasena == null || adminContrasena.isBlank()) {
            log.warn("""
                    ================================================================
                     NO HAY NINGÚN ADMINISTRADOR EN LA BASE DE DATOS.
                     El panel administrativo queda inaccesible.

                     Para crear uno, define estas variables de entorno y reinicia:
                       ADMIN_USUARIO      nombre de usuario del administrador
                       ADMIN_CONTRASENA   contraseña (mínimo 8 caracteres)
                       ADMIN_CORREO       correo (opcional)
                    ================================================================""");
            return;
        }

        if (adminContrasena.length() < 8) {
            log.error("ADMIN_CONTRASENA tiene menos de 8 caracteres. No se creó el administrador.");
            return;
        }

        usuarioRepository.findByUsuario(adminUsuario).ifPresentOrElse(
                existente -> {
                    existente.setRol(Rol.ADMIN);
                    existente.setActivo(true);
                    usuarioRepository.save(existente);
                    log.info("Usuario '{}' promovido a ADMIN.", adminUsuario);
                },
                () -> {
                    Usuario admin = new Usuario();
                    admin.setNombre("Administrador");
                    admin.setApellido("");
                    admin.setUsuario(adminUsuario);
                    admin.setCorreo(adminCorreo);
                    admin.setContrasena(passwordEncoder.encode(adminContrasena));
                    admin.setRol(Rol.ADMIN);
                    admin.setActivo(true);
                    usuarioRepository.save(admin);
                    log.info("Administrador inicial '{}' creado.", adminUsuario);
                });
    }
}
