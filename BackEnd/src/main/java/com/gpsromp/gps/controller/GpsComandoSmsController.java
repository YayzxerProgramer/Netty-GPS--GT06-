package com.gpsromp.gps.controller;

import com.gpsromp.common.exception.OperacionNoPermitidaException;
import com.gpsromp.common.exception.RecursoNoEncontradoException;
import com.gpsromp.common.service.SmsService;
import com.gpsromp.vehiculo.model.Vehiculo;
import com.gpsromp.vehiculo.repository.VehiculoRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Controlador para enviar comandos SMS de respaldo directo a la SIM Card de los GPS GT06.
 */
@RestController
@RequestMapping("/gps/comando-sms")
@RequiredArgsConstructor
@Slf4j
public class GpsComandoSmsController {

    private final VehiculoRepository vehiculoRepository;
    private final SmsService smsService;

    @Data
    public static class ComandoSmsRequest {
        private String imei;
        private String comando; // CORTE_MOTOR, RESTAURAR_MOTOR, ESTADO
        private String telefonoSim;
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or @seguridad.esMiImei(#request.imei, authentication)")
    public ResponseEntity<Map<String, Object>> enviarComandoSms(@RequestBody ComandoSmsRequest request) {
        if (request.getImei() == null || request.getImei().isBlank()) {
            throw new IllegalArgumentException("El IMEI es obligatorio");
        }

        Vehiculo vehiculo = vehiculoRepository.findByImei(request.getImei())
                .orElseThrow(() -> new RecursoNoEncontradoException("Vehículo no encontrado con IMEI: " + request.getImei()));

        String destinoSms = request.getTelefonoSim();
        if (destinoSms == null || destinoSms.isBlank()) {
            throw new OperacionNoPermitidaException("Se requiere el número telefónico de la SIM Card del GPS para enviar el comando SMS");
        }

        String comandoHex;
        switch (request.getComando().toUpperCase()) {
            case "CORTE_MOTOR":
                comandoHex = "#RELAY,1#";
                break;
            case "RESTAURAR_MOTOR":
                comandoHex = "#RELAY,0#";
                break;
            case "ESTADO":
                comandoHex = "#STATUS#";
                break;
            default:
                throw new IllegalArgumentException("Comando desconocido: " + request.getComando());
        }

        boolean enviado = smsService.enviarSms(destinoSms, comandoHex);
        log.info("Comando SMS {} ('{}') enviado a SIM {} para vehículo IMEI {}", request.getComando(), comandoHex, destinoSms, request.getImei());

        return ResponseEntity.ok(Map.of(
                "exito", enviado,
                "imei", request.getImei(),
                "comandoEnviado", comandoHex,
                "mensaje", enviado ? "Comando SMS enviado correctamente al dispositivo GPS" : "Fallo al entregar el comando SMS"
        ));
    }
}
