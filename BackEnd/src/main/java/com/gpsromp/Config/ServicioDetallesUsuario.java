package com.gpsromp.config;

import com.gpsromp.usuario.model.Usuario;
import com.gpsromp.usuario.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ServicioDetallesUsuario implements UserDetailsService {

    private final UsuarioRepository repositorioUsuario;

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {

        Usuario usuarioEncontrado = repositorioUsuario.findByUsuario(username)
                .orElseThrow(() -> new UsernameNotFoundException(
                        "No se encontró el usuario: " + username));

        if (!Boolean.TRUE.equals(usuarioEncontrado.getActivo())) {
            throw new UsernameNotFoundException("El usuario está inactivo: " + username);
        }

        // rol es un enum: .name() garantiza la forma exacta "ROLE_ADMINISTRADOR" / "ROLE_USUARIO".
        java.util.List<SimpleGrantedAuthority> autoridades = new java.util.ArrayList<>();
        autoridades.add(new SimpleGrantedAuthority("ROLE_" + usuarioEncontrado.getRol().name()));
        if (usuarioEncontrado.getRol() == com.gpsromp.usuario.model.Rol.ADMINISTRADOR) {
            autoridades.add(new SimpleGrantedAuthority("ROLE_ADMIN"));
        }

        return User.builder()
                .username(usuarioEncontrado.getUsuario())
                .password(usuarioEncontrado.getContrasena())
                .authorities(autoridades)
                .build();
    }
}
