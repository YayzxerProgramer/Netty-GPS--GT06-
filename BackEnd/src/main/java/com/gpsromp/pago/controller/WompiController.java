package com.gpsromp.pago.controller;

import com.gpsromp.pago.service.WompiService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/pagos/wompi")
@RequiredArgsConstructor
@Slf4j
public class WompiController {

    private final WompiService wompiService;

    @PostMapping("/webhook")
    public ResponseEntity<Map<String, Object>> webhook(@RequestBody Map<String, Object> payload) {
        log.info("Webhook Wompi invocado");
        boolean procesado = wompiService.procesarWebhook(payload);
        return ResponseEntity.ok(Map.of("recibido", procesado));
    }
}
