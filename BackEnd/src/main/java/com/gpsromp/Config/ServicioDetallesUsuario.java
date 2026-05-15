package com.gpsromp.Config;

import com.gpsromp.usuario.model.Usuario;
import com.gpsromp.usuario.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;

/*
 * Esta clase es el puente entre tu base de datos y Spring Security.
 * Implementa UserDetailsService, que es la interfaz que Spring Security
 * usa para pedirte que le traigas un usuario cuando alguien intenta iniciar sesión.
 *
 * Spring Security no sabe nada de tu tabla Usuarios ni de PostgreSQL.
 * Esta clase se encarga de buscarlo y traducirlo a un formato que Spring entienda.
 */
@Service
@RequiredArgsConstructor
public class ServicioDetallesUsuario implements UserDetailsService {

    /*
     * Inyectamos el repositorio de usuarios para poder
     * consultar la base de datos PostgreSQL.
     */
    private final UsuarioRepository repositorioUsuario;

    /*
     * Este es el único método que exige la interfaz UserDetailsService.
     * Spring Security lo llama automáticamente cuando alguien intenta
     * iniciar sesión, pasándole el nombre de usuario que escribió en el login.
     *
     * El parámetro se llama "username" porque así lo exige la interfaz,
     * aunque en tu proyecto el campo se llama "usuario".
     */
    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {

        /*
         * Buscamos el usuario en PostgreSQL usando tu repositorio.
         * Si no existe, lanzamos UsernameNotFoundException.
         * Spring Security captura esa excepción y devuelve 401 al cliente.
         */
        Usuario usuarioEncontrado = repositorioUsuario.findByUsuario(username)
                .orElseThrow(() -> new UsernameNotFoundException(
                "No se encontró el usuario: " + username
        ));

        /*
         * Verificamos si el usuario está activo en tu sistema.
         * Esta es tu lógica de negocio propia — Spring no sabe
         * que tienes un campo "activo", por eso lo verificamos aquí.
         */
        if (!usuarioEncontrado.getActivo()) {
            throw new UsernameNotFoundException(
                    "El usuario está inactivo: " + username
            );
        }

        /*
         * Construimos el rol con el prefijo "ROLE_" que exige Spring Security.
         * Si tu usuario tiene rol "USER", Spring lo necesita como "ROLE_USER".
         * Si tiene "ADMIN", lo necesita como "ROLE_ADMIN".
         *
         * SimpleGrantedAuthority es la clase de Spring que representa un permiso o rol.
         */
        SimpleGrantedAuthority autoridad = new SimpleGrantedAuthority(
                "ROLE_" + usuarioEncontrado.getRol()
        );

        /*
         * Convertimos tu objeto Usuario (entidad de tu BD)
         * a un objeto UserDetails (lo que Spring Security entiende).
         *
         * Spring Security usará este objeto para:
         * 1. Comparar la contraseña con BCrypt
         * 2. Saber qué roles tiene el usuario
         * 3. Saber si puede acceder a las rutas protegidas
         *
         * Nota: la contraseña que pasamos aquí ya está hasheada con BCrypt
         * porque así la guardamos en la BD al registrar el usuario.
         * Spring se encarga de compararla con la que llegó del login.
         */
        return User.builder()
                .username(usuarioEncontrado.getUsuario()) // tu campo "usuario" → username de Spring
                .password(usuarioEncontrado.getContrasena()) // hash BCrypt de tu BD
                .authorities(List.of(autoridad)) // tus roles → formato Spring
                .build();
    }
}
