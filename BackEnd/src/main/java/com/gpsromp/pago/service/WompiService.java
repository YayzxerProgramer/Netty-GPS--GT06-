package com.gpsromp.pago.service;

import com.gpsromp.pago.model.Pago;
import com.gpsromp.pago.model.Suscripcion;
import com.gpsromp.pago.repository.PagoRepository;
import com.gpsromp.pago.repository.SuscripcionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class WompiService {

    private final PagoRepository pagoRepository;
    private final SuscripcionRepository suscripcionRepository;

    @Value("${wompi.events.secret:test_events_secret_12345}")
    private String eventsSecret;

    /**
     * Procesa el evento recibido por Webhook desde Wompi (transaction.updated).
     */
    @SuppressWarnings("unchecked")
    public boolean procesarWebhook(Map<String, Object> payload) {
        try {
            String event = (String) payload.get("event");
            if (!"transaction.updated".equals(event)) {
                log.info("Evento Wompi ignorado: {}", event);
                return true;
            }

            Map<String, Object> data = (Map<String, Object>) payload.get("data");
            if (data == null) return false;

            Map<String, Object> transaction = (Map<String, Object>) data.get("transaction");
            if (transaction == null) return false;

            String txId = (String) transaction.get("id");
            String status = (String) transaction.get("status");
            String reference = (String) transaction.get("reference");
            Number amountInCents = (Number) transaction.get("amount_in_cents");
            String currency = (String) transaction.get("currency");
            String paymentMethodType = (String) transaction.get("payment_method_type");

            BigDecimal monto = BigDecimal.valueOf(amountInCents != null ? amountInCents.longValue() / 100.0 : 0);

            log.info("Transacción Wompi recibida: ID={}, Ref={}, Estado={}, Monto={}", txId, reference, status, monto);

            // Guardar o actualizar Pago
            Pago pago = pagoRepository.findByTransaccionIdWompi(txId)
                    .orElse(Pago.builder()
                            .transaccionIdWompi(txId)
                            .referenciaWompi(reference)
                            .build());

            pago.setMonto(monto);
            pago.setMoneda(currency);
            pago.setEstado(status);
            pago.setMetodoPago(paymentMethodType);
            pagoRepository.save(pago);

            if ("APPROVED".equalsIgnoreCase(status)) {
                // Si la referencia contiene el IMEI o ID del plan (ej. "SUB-3589...-PRO")
                actualizarSuscripcionPorReferencia(reference);
            }

            return true;
        } catch (Exception e) {
            log.error("Error al procesar webhook de Wompi: {}", e.getMessage(), e);
            return false;
        }
    }

    private void actualizarSuscripcionPorReferencia(String reference) {
        // Formato esperado de referencia: SUB-{IMEI}-{PLAN}
        if (reference != null && reference.startsWith("SUB-")) {
            String[] partes = reference.split("-");
            if (partes.length >= 3) {
                String imei = partes[1];
                String plan = partes[2];

                Suscripcion suscripcion = suscripcionRepository.findByImei(imei)
                        .orElse(Suscripcion.builder()
                                .imei(imei)
                                .plan(plan)
                                .build());

                suscripcion.setPlan(plan);
                suscripcion.setEstado("ACTIVA");
                suscripcion.setFechaInicio(LocalDateTime.now());
                suscripcion.setFechaFin(LocalDateTime.now().plusDays(30)); // 1 mes de suscripción

                suscripcionRepository.save(suscripcion);
                log.info("Suscripción ACTIVADA para el vehículo con IMEI {}: Plan {}", imei, plan);
            }
        }
    }
}
