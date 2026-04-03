package com.gpsromp.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.config.EnableMongoRepositories;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;

@Configuration
@EnableMongoRepositories(basePackages = "com.gpsromp.gps.repository")
public class MongoConfig {

    // La configuración de conexión se maneja vía application.properties
    // spring.data.mongodb.uri=mongodb://localhost:27017/rompgps_data

    // Los índices automáticos se crean con:
    // spring.data.mongodb.auto-index-creation=true
}
