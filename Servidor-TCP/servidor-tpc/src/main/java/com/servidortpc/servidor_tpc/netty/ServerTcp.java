package com.servidortpc.servidor_tpc.netty;

import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import com.servidortpc.servidor_tpc.Service.GpsDataService;

import io.netty.bootstrap.ServerBootstrap;
import io.netty.channel.EventLoopGroup;
import io.netty.channel.nio.NioEventLoopGroup;
import io.netty.channel.socket.nio.NioServerSocketChannel;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;

@Component
public class ServerTcp {

    private final GpsInitializer gpsInitializer;
    private EventLoopGroup aceptarConexiones;
    private EventLoopGroup procesaDatos;
    @SuppressWarnings("unused")
    private final GpsDataService gpsDataService;
    @SuppressWarnings("unused")
    private final RestTemplate restTemplate;

    public ServerTcp(GpsDataService gpsDataService, RestTemplate restTemplate) {
        this.gpsDataService = gpsDataService;
        this.restTemplate = restTemplate;
        this.gpsInitializer = new GpsInitializer(gpsDataService, restTemplate);
    }

    @SuppressWarnings("deprecation")
    @PostConstruct
    public void iniciarServidor() throws Exception {
        aceptarConexiones = new NioEventLoopGroup(1);
        procesaDatos = new NioEventLoopGroup();

        ServerBootstrap server = new ServerBootstrap();

        server
                .group(aceptarConexiones, procesaDatos)
                .channel(NioServerSocketChannel.class)
                .childHandler(gpsInitializer);

        server.bind(9000).sync();

        System.out.println("TCP GPS Server escuchando en puerto 9000");
    }

    @PreDestroy
    public void cerrarServidor() {
        aceptarConexiones.shutdownGracefully();
        procesaDatos.shutdownGracefully();
    }

}
