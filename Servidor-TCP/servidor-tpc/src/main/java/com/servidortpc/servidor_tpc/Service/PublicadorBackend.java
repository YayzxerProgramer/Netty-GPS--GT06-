package com.servidortpc.servidor_tpc.Service;

import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.TimeUnit;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.servidortpc.servidor_tpc.Model.GPSData;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;

/**
 * Envía las posiciones al BackEnd fuera del event loop de Netty.
 *
 * ARREGLA DOS PROBLEMAS:
 *
 * 1. I/O BLOQUEANTE EN EL EVENT LOOP. Antes se llamaba a
 *    restTemplate.postForEntity() directamente desde el hilo NioEventLoopGroup,
 *    con un RestTemplate sin timeouts. Un backend lento o caído congelaba ese
 *    hilo indefinidamente y con él a TODOS los dispositivos asignados a él.
 *
 * 2. POSICIONES PERDIDAS SIN REMEDIO. Si el POST fallaba solo se imprimía el
 *    error: no había cola, ni reintento, ni persistencia. La posición se perdía
 *    para siempre. Ahora hay una cola en memoria y reintentos con espera
 *    creciente.
 *
 * La cola es acotada a propósito: si el backend lleva mucho tiempo caído, es
 * preferible descartar las posiciones más antiguas a agotar la memoria y tirar
 * el proceso entero. Cada descarte queda registrado.
 *
 * Limitación conocida: la cola vive en memoria, así que un reinicio del proceso
 * pierde lo pendiente. Persistirla en disco sería el siguiente paso.
 */
@Service
public class PublicadorBackend {

    private static final Logger log = LoggerFactory.getLogger(PublicadorBackend.class);

    private static final int CAPACIDAD_COLA = 10_000;
    private static final int MAXIMO_REINTENTOS = 5;
    private static final long ESPERA_BASE_MS = 1_000;

    private final RestTemplate restTemplate;
    private final BlockingQueue<Pendiente> cola = new ArrayBlockingQueue<>(CAPACIDAD_COLA);

    private Thread trabajador;
    private volatile boolean activo = true;

    @Value("${backend.base-url}")
    private String backendBaseUrl;

    @Value("${gps.ingesta.api-key}")
    private String apiKey;

    public PublicadorBackend(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @PostConstruct
    void iniciar() {
        trabajador = new Thread(this::procesarCola, "publicador-backend");
        trabajador.setDaemon(true);
        trabajador.start();
        log.info("Publicador hacia {} iniciado", backendBaseUrl);
    }

    @PreDestroy
    void detener() {
        activo = false;
        if (trabajador != null) {
            trabajador.interrupt();
        }
    }

    /** Encola la posición y vuelve de inmediato. Nunca bloquea a quien llama. */
    public void publicar(GPSData gps) {
        if (!cola.offer(new Pendiente(gps, 0))) {
            // Cola llena: se descarta la más antigua para dejar sitio a la nueva,
            // que es la que tiene valor operativo.
            Pendiente descartada = cola.poll();
            cola.offer(new Pendiente(gps, 0));
            log.warn("Cola de envío llena ({}). Descartada una posición antigua de {}",
                    CAPACIDAD_COLA, descartada == null ? "?" : descartada.gps.getImei());
        }
    }

    private void procesarCola() {
        while (activo) {
            try {
                Pendiente pendiente = cola.take();
                enviar(pendiente);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return;
            } catch (Exception e) {
                log.error("Error inesperado en el publicador: {}", e.getMessage());
            }
        }
    }

    private void enviar(Pendiente pendiente) throws InterruptedException {
        try {
            HttpHeaders cabeceras = new HttpHeaders();
            cabeceras.setContentType(MediaType.APPLICATION_JSON);
            // El backend rechaza la ingesta sin esta cabecera: antes POST /gps
            // era público y cualquiera podía inyectar posiciones falsas.
            cabeceras.set("X-API-Key", apiKey);

            restTemplate.postForEntity(
                    backendBaseUrl + "/gps",
                    new HttpEntity<>(pendiente.gps, cabeceras),
                    Void.class);

        } catch (Exception e) {
            int intento = pendiente.intento + 1;

            if (intento >= MAXIMO_REINTENTOS) {
                log.error("Posición de {} descartada tras {} intentos: {}",
                        pendiente.gps.getImei(), MAXIMO_REINTENTOS, e.getMessage());
                return;
            }

            // Espera creciente: 1s, 2s, 4s, 8s. Evita martillear un backend caído.
            long espera = ESPERA_BASE_MS * (1L << (intento - 1));
            log.warn("Fallo al enviar la posición de {} (intento {}). Reintento en {} ms: {}",
                    pendiente.gps.getImei(), intento, espera, e.getMessage());

            TimeUnit.MILLISECONDS.sleep(espera);
            cola.offer(new Pendiente(pendiente.gps, intento));
        }
    }

    private record Pendiente(GPSData gps, int intento) {
    }
}
