package com.gpsromp.Config;

import java.time.Duration;

import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

/**
 * Configuración web general.
 *
 * Ya no declara un CorsFilter propio: había tres capas de CORS solapadas y
 * contradictorias (esta, la de SecurityConfig y @CrossOrigin en cada
 * controlador). Ahora la política vive solo en SecurityConfig.
 *
 * El RestTemplate lleva timeouts explícitos. El bean anterior no los tenía y
 * además nadie lo inyectaba: UsuarioController hacía new RestTemplate() a mano
 * en tres sitios, así que una llamada lenta a Google o GitHub podía dejar un
 * hilo del servidor colgado indefinidamente.
 */
@Configuration
public class WebConfig {

    @Bean
    public RestTemplate restTemplate(RestTemplateBuilder builder) {
        return builder
                .setConnectTimeout(Duration.ofSeconds(5))
                .setReadTimeout(Duration.ofSeconds(10))
                .build();
    }
}
