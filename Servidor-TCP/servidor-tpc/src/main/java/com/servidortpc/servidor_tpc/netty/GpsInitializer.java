package com.servidortpc.servidor_tpc.netty;

import java.util.concurrent.TimeUnit;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.servidortpc.servidor_tpc.Service.GpsDataService;
import com.servidortpc.servidor_tpc.Service.PublicadorBackend;

import io.netty.channel.ChannelInitializer;
import io.netty.channel.ChannelPipeline;
import io.netty.channel.socket.SocketChannel;
import io.netty.handler.timeout.IdleStateHandler;

/**
 * Pipeline de cada conexión entrante.
 *
 * Antes contenía únicamente el handler, sin decodificador de tramas y sin
 * control de inactividad. Ahora:
 *
 *   1. IdleStateHandler       cierra las conexiones mudas (típico en GPRS,
 *                             donde el enlace muere sin cerrar el socket).
 *   2. DecodificadorTramaGt06 desencuadra y valida el CRC; es lo que arregla
 *                             la pérdida de tramas fragmentadas.
 *   3. GpsServerHandler       interpreta. UNA INSTANCIA POR CANAL: tiene estado
 *                             propio (imei, accEncendido) y compartirla haría
 *                             que todos los dispositivos se pisaran entre sí.
 */
@Component
public class GpsInitializer extends ChannelInitializer<SocketChannel> {

    private final GpsDataService gpsDataService;
    private final PublicadorBackend publicador;

    @Value("${gps.tcp.inactividad-segundos:300}")
    private int inactividadSegundos;

    public GpsInitializer(GpsDataService gpsDataService, PublicadorBackend publicador) {
        this.gpsDataService = gpsDataService;
        this.publicador = publicador;
    }

    @Override
    protected void initChannel(SocketChannel canal) {
        ChannelPipeline flujo = canal.pipeline();

        flujo.addLast(new IdleStateHandler(inactividadSegundos, 0, 0, TimeUnit.SECONDS));
        flujo.addLast(new DecodificadorTramaGt06());
        flujo.addLast(new GpsServerHandler(gpsDataService, publicador));
    }
}
