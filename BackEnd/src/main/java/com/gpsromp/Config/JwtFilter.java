package com.gpsromp.Config;

import java.io.IOException;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Autenticación por JWT en cada petición.
 *
 * Las authorities se leen de la base de datos, no del claim "rol" del token. Es
 * intencionado: si un administrador degrada o desactiva a alguien, el cambio
 * surte efecto en la siguiente petición sin esperar a que caduque el token, que
 * dura 24 horas y no es revocable.
 *
 * ARREGLO: loadByUsername lanza UsernameNotFoundException cuando el usuario fue
 * borrado o desactivado, y antes esa excepción se propagaba fuera del filtro, así
 * que TODA petición de un usuario recién desactivado devolvía HTTP 500 en lugar
 * de 401. Justo el escenario que estrena el panel al desactivar cuentas.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class JwtFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final ServicioDetallesUsuario servicioDetallesUsuario;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            chain.doFilter(request, response);
            return;
        }

        String token = authHeader.substring(7);

        // esAccesoValido, no esValido: un token de refresco no debe servir
        // para autenticar peticiones, solo para pedir un acceso nuevo.
        if (!jwtUtil.esAccesoValido(token)) {
            // Contexto limpio: sin autenticación, el entry point responde 401.
            SecurityContextHolder.clearContext();
            request.setAttribute("motivoNoAutenticado", "Token inválido o expirado");
            chain.doFilter(request, response);
            return;
        }

        try {
            String nombreUsuario = jwtUtil.extraerUsuario(token);
            UserDetails detalles = servicioDetallesUsuario.loadUserByUsername(nombreUsuario);

            var auth = new UsernamePasswordAuthenticationToken(
                    detalles, null, detalles.getAuthorities());
            auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

            SecurityContextHolder.getContext().setAuthentication(auth);

        } catch (UsernameNotFoundException e) {
            // Usuario borrado o desactivado con un token todavía vigente.
            SecurityContextHolder.clearContext();
            request.setAttribute("motivoNoAutenticado", "La cuenta no está disponible");
            log.debug("Token válido de una cuenta no disponible: {}", e.getMessage());
        }

        chain.doFilter(request, response);
    }
}
