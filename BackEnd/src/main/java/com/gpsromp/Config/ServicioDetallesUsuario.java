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

import java.util.List;

@Service
@RequiredArgsConstructor
public class ServicioDetallesUsuario implements UserDetailsService {

        private final UsuarioRepository repositorioUsuario;

        @Override
        public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {

                Usuario usuarioEncontrado = repositorioUsuario.findByUsuario(username)
                                .orElseThrow(() -> new UsernameNotFoundException(
                                                "No se encontró el usuario: " + username));

                if (!usuarioEncontrado.getActivo()) {
                        throw new UsernameNotFoundException(
                                        "El usuario está inactivo: " + username);
                }

                SimpleGrantedAuthority autoridad = new SimpleGrantedAuthority(
                                "ROLE_" + usuarioEncontrado.getRol());

                return User.builder()
                                .username(usuarioEncontrado.getUsuario())
                                .password(usuarioEncontrado.getContrasena())
                                .authorities(List.of(autoridad))
                                .build();
        }
}
