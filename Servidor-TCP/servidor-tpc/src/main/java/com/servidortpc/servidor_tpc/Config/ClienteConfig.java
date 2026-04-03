package com.servidortpc.servidor_tpc.Config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

@Configuration
public class ClienteConfig {

    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }
}