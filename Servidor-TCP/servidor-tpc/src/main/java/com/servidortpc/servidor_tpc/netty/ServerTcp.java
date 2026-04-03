package com.servidortpc.servidor_tpc.netty;

import org.springframework.stereotype.Component;

import io.netty.bootstrap.ServerBootstrap;
import io.netty.channel.EventLoopGroup;
import io.netty.channel.nio.NioEventLoopGroup;
import io.netty.channel.socket.nio.NioServerSocketChannel;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;

@Component
public class ServerTcp {

    int puerto = 9000;

    private EventLoopGroup aceptarConexiones;
    private EventLoopGroup procesaDatos;

    @SuppressWarnings("deprecation")
    @PostConstruct
    public void iniciarServidor() throws Exception {
        aceptarConexiones = new NioEventLoopGroup(1);
        procesaDatos = new NioEventLoopGroup();

        ServerBootstrap server = new ServerBootstrap();

        server
                .group(aceptarConexiones, procesaDatos)
                .channel(NioServerSocketChannel.class)
                .childHandler(new GpsInitializer());

        server.bind(puerto).sync();

        System.out.println("TCP GPS Server escuchando en puerto 9000");
    }

    @PreDestroy
    public void cerrarServidor() {
        aceptarConexiones.shutdownGracefully();
        procesaDatos.shutdownGracefully();
    }

}
