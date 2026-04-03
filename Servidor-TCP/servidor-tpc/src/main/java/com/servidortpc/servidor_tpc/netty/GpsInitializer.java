package com.servidortpc.servidor_tpc.netty;

import org.springframework.stereotype.Component;

import io.netty.channel.ChannelInitializer;
import io.netty.channel.ChannelPipeline;
import io.netty.channel.socket.SocketChannel;

@Component
public class GpsInitializer extends ChannelInitializer<SocketChannel> {

    @Override
    protected void initChannel(SocketChannel canal) throws Exception {
        ChannelPipeline flujo = canal.pipeline();
        flujo.addLast(new GpsServerHandler());
    }

}
