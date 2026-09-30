package com.gpsromp.usuario.service;

import com.gpsromp.common.exception.OperacionNoPermitidaException;
import com.gpsromp.common.service.SmsService;
import com.gpsromp.usuario.dto.SesionResponse;
import com.gpsromp.usuario.model.Rol;
import com.gpsromp.usuario.model.Usuario;
import com.gpsromp.usuario.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;
import java.util.Optional;
import java.util.UUID;

/**
 * Servicio para autenticación sin contraseña mediante OTP enviada por SMS.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AuthSmsService {

    private final UsuarioRepository usuarioRepository;
    private final ServicioAutenticacion servicioAutenticacion;
    private final SmsService smsService;
    private final StringRedisTemplate stringRedisTemplate;
    private final PasswordEncoder passwordEncoder;

    private static final String REDIS_OTP_PREFIX = "otp:phone:";
    private static final SecureRandom RANDOM = new SecureRandom();

    /**
     * Genera un código OTP de 6 dígitos, lo almacena en Redis (expira en 5 minutos)
     * y envía el SMS vía Hablame.co / SmsService.
     */
    public boolean solicitarCodigo(String telefono) {
        String telefonoLimpio = normalizarTelefono(telefono);

        // Generar OTP de 6 dígitos (ej. "482910")
        String codigo = String.format("%06d", RANDOM.nextInt(1000000));
        String redisKey = REDIS_OTP_PREFIX + telefonoLimpio;

        // Almacenar en Redis con TTL de 5 minutos
        stringRedisTemplate.opsForValue().set(redisKey, codigo, Duration.ofMinutes(5));

        String mensaje = "Tu codigo de verificacion para RompGPS es: " + codigo + ". Valido por 5 minutos.";
        log.info("Generado OTP para {}: {}", telefonoLimpio, codigo);

        return smsService.enviarSms(telefonoLimpio, mensaje);
    }

    /**
     * Verifica el código OTP recibido contra Redis. Si es válido, busca el usuario por teléfono
     * o crea una nueva cuenta de usuario asignada a ese celular. Emite un token JWT de sesión.
     */
    public SesionResponse verificarCodigo(String telefono, String codigo) {
        String telefonoLimpio = normalizarTelefono(telefono);
        String redisKey = REDIS_OTP_PREFIX + telefonoLimpio;

        String otpGuardado = stringRedisTemplate.opsForValue().get(redisKey);
        if (otpGuardado == null || !otpGuardado.equals(codigo)) {
            throw new OperacionNoPermitidaException("Código OTP inválido o expirado");
        }

        // Eliminar OTP de Redis para evitar reutilización
        stringRedisTemplate.delete(redisKey);

        // Buscar o crear usuario
        Optional<Usuario> usuarioOpt = usuarioRepository.findByTelefono(telefonoLimpio);
        Usuario usuario;

        if (usuarioOpt.isPresent()) {
            usuario = usuarioOpt.get();
        } else {
            // Generar usuario aleatorio nuevo
            String usernameGen = "user_" + telefonoLimpio;
            String emailGen = telefonoLimpio + "@sms.rompgps.local";

            usuario = new Usuario();
            usuario.setNombre("Usuario");
            usuario.setApellido("SMS");
            usuario.setUsuario(usernameGen);
            usuario.setCorreo(emailGen);
            usuario.setTelefono(telefonoLimpio);
            usuario.setContrasena(passwordEncoder.encode(UUID.randomUUID().toString()));
            usuario.setRol(Rol.USER);
            usuario.setActivo(true);

            usuario = usuarioRepository.save(usuario);
            log.info("Nuevo usuario creado vía SMS OTP: {}", usernameGen);
        }

        if (!Boolean.TRUE.equals(usuario.getActivo())) {
            throw new OperacionNoPermitidaException("La cuenta está desactivada");
        }

        return servicioAutenticacion.emitirSesion(usuario);
    }

    private String normalizarTelefono(String telefono) {
        if (telefono == null) return "";
        String limpio = telefono.replaceAll("[^0-9]", "");
        if (!limpio.startsWith("57") && limpio.length() == 10) {
            limpio = "57" + limpio;
        }
        return limpio;
    }
}
