package com.servidortpc.servidor_tpc.Config;

import java.time.Duration;

import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

/**
 * Cliente HTTP hacia el BackEnd.
 *
 * Los timeouts son obligatorios aquí: sin ellos, una llamada al backend puede
 * quedarse esperando indefinidamente. Antes era un new RestTemplate() pelado y
 * además se invocaba desde el event loop de Netty, así que un backend colgado
 * bloqueaba a todos los dispositivos de ese hilo.
 */
@Configuration
public class ClienteConfig {

    @Bean
    public RestTemplate restTemplate(RestTemplateBuilder builder) {
        return builder
                .setConnectTimeout(Duration.ofSeconds(5))
                .setReadTimeout(Duration.ofSeconds(10))
                .build();
    }
}
