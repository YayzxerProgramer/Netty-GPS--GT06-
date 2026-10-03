package com.gpsromp.common.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

/**
 * Servicio para envío de SMS transaccionales y OTPs a través de Hablame.co u otros proveedores.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class SmsService {

    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${sms.hablame.account:}")
    private String account;

    @Value("${sms.hablame.api-key:}")
    private String apiKey;

    @Value("${sms.hablame.token:}")
    private String token;

    @Value("${sms.hablame.url:https://api1.hablame.co/1/sms/send}")
    private String apiUrl;

    /**
     * Envía un mensaje SMS a un número de teléfono celular en Colombia o internacional.
     * Si no se configuran credenciales en desarrollo, simula el envío en los logs.
     */
    public boolean enviarSms(String numeroDestino, String mensaje) {
        if (numeroDestino == null || numeroDestino.isBlank()) {
            log.warn("No se proporcionó un número de destino para el SMS.");
            return false;
        }

        // Limpieza básica del número (+573001234567 -> 3001234567)
        String numeroLimpio = numeroDestino.replaceAll("[^0-9]", "");
        if (numeroLimpio.startsWith("57") && numeroLimpio.length() == 12) {
            numeroLimpio = numeroLimpio.substring(2);
        }

        if (apiKey.isBlank() || account.isBlank()) {
            log.info("[MODO SIMULACIÓN SMS] Para: {} | Mensaje: '{}'", numeroLimpio, mensaje);
            return true;
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("account", account);
            headers.set("apiKey", apiKey);
            headers.set("token", token);

            Map<String, Object> body = new HashMap<>();
            body.put("toNumber", numeroLimpio);
            body.put("sms", mensaje);
            body.put("sc", "890202"); // Shortcode genérico de Hablame.co

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(apiUrl, entity, String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("SMS enviado exitosamente a {}: {}", numeroLimpio, response.getBody());
                return true;
            } else {
                log.error("Error al enviar SMS a {}: {}", numeroLimpio, response.getBody());
                return false;
            }
        } catch (Exception e) {
            log.error("Excepción al enviar SMS a {}: {}", numeroLimpio, e.getMessage(), e);
            return false;
        }
    }
}
