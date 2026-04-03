package com.servidortpc.servidor_tpc.netty;

import org.springframework.stereotype.Component;

import com.servidortpc.servidor_tpc.Model.GPSData;

import io.netty.buffer.ByteBuf;
import io.netty.channel.ChannelHandler;
import io.netty.channel.ChannelHandlerContext;
import io.netty.channel.SimpleChannelInboundHandler;

@Component
@ChannelHandler.Sharable
public class GpsServerHandler extends SimpleChannelInboundHandler<ByteBuf> {


    private boolean accOn = false;
    private final boolean corteMotor = false;

    String imei = "";


    // Login
    private void login(ChannelHandlerContext contexto, ByteBuf paquete) {

        // Leer IMEI (8 bytes)
        byte[] imeiBytes = new byte[8];
        paquete.readBytes(imeiBytes);

        //Decodificando el IMEI 
        imei = GT06Utils.decodificarIMEI(imeiBytes);
        // Ahora SÍ leer serial
        short serial = paquete.readShort();

        //Verificando el serial
        System.out.println("Serial recibido: " + String.format("%04X", serial));

        //Imprimiendo el IMEI
        System.out.println("IMEI: " + imei);

        //Construyendo Respuesta (ACK)
        ByteBuf respuesta_ack = GT06Utils.ACK(serial);

        //Guardando el ACK
        byte[] bytes = new byte[respuesta_ack.readableBytes()];
        respuesta_ack.getBytes(0, bytes);

        //Mostrando el ACK
        System.out.print("ACK enviado: ");
        for (byte b : bytes) {
            System.out.printf("%02X ", b);
        }
        System.out.println();

        //Dandole Contexto al Servidor de la respuesta
        contexto.writeAndFlush(respuesta_ack);
    }

    private void ubicacion(ByteBuf paquete) {

        int year = 2000 + paquete.readUnsignedByte();
        int mes = paquete.readUnsignedByte();
        int dia = paquete.readUnsignedByte();
        int hora = paquete.readUnsignedByte();
        int minuto = paquete.readUnsignedByte();
        int segundo = paquete.readUnsignedByte();

        paquete.readUnsignedByte();

        int latitudCruda = paquete.readInt();
        int longitudCruda = paquete.readInt();

        int velocidad = paquete.readUnsignedByte();
        int courseStatus = paquete.readUnsignedShort();

        // Conversión base
        double latitud = latitudCruda / 1800000.0;
        double longitud = longitudCruda / 1800000.0;

        // Bits importantes
        boolean gpsValido = (courseStatus & 0x0400) != 0;
        boolean oeste = (courseStatus & 0x0800) != 0;
        boolean sur = (courseStatus & 0x1000) != 0;

        // Aplicar signo correctamente
        if (sur) {
            latitud = -latitud;
        }
        if (oeste) {
            longitud = -longitud;
        }

        System.out.printf(
                "Fecha: %04d-%02d-%02d %02d:%02d:%02d, Lat: %f, Lon: %f, Velocidad: %d km/h, GPS valido: %b\n",
                year, mes, dia, hora, minuto, segundo,
                latitud, longitud, velocidad, gpsValido
        );

        String tiempo = "Año: " + year + " Mes: " + mes + 
        " Dia: " + dia + " Hora: " + hora + " Minuto: " + minuto + " Segundo:" + segundo;

        GPSData gps = new GPSData(
                imei,
                tiempo,
                latitud,
                longitud,
                velocidad,
                gpsValido,
                accOn,
                corteMotor
        );
        
    }

    private void heartbeat(ChannelHandlerContext contexto, ByteBuf contenido) {

        byte terminalInfo = contenido.readByte();  // ESTE es el byte con bits (incluye ACC)
        byte nivelGsm = contenido.readByte();

        short serial = contenido.readShort();

        accOn = (terminalInfo & 0x04) != 0;

        System.out.println("Heartbeat recibido");
        System.out.println("Terminal info: " + String.format("%02X", terminalInfo));
        System.out.println("Señal GSM: " + (nivelGsm & 0xFF));

        ByteBuf ack = GT06Utils.ACKHeartbeat(serial);
        contexto.writeAndFlush(ack);

    }

    @Override
    public void channelInactive(ChannelHandlerContext ctx) {
        System.out.println("GPS desconectado");
    }

    @Override
    public void exceptionCaught(ChannelHandlerContext contexto, Throwable causa) {
        System.out.println("El error del servidor es: " + causa);
        contexto.close();
    }

    @Override
    public void channelActive(ChannelHandlerContext contexto) {
        System.out.println("GPS Conectado: " + contexto.channel().remoteAddress());
    }

    @Override
    protected void channelRead0(ChannelHandlerContext contexto, ByteBuf paquete) throws Exception {
        while (paquete.readableBytes() >= 5) {

            paquete.markReaderIndex();

            byte primerByte = paquete.readByte();
            byte segundoByte = paquete.readByte();

            if (primerByte != 0x78 || segundoByte != 0x78) {
                paquete.resetReaderIndex();
                paquete.readByte();
                continue;
            }

            int longitud = paquete.readUnsignedByte();

            if (paquete.readableBytes() < longitud + 2) {
                paquete.resetReaderIndex();
                return;
            }

            ByteBuf contenido = paquete.readSlice(longitud);

            byte protocolo = contenido.readByte();

            System.out.println("Protocolo recibido: " + String.format("%02X", protocolo));

            switch (protocolo) {
                case 0x01 ->
                    login(contexto, contenido);
                case 0x12 ->
                    ubicacion(contenido);
                case 0x13 ->
                    heartbeat(contexto, contenido);
            }

            paquete.readUnsignedShort(); // CRC

            if (paquete.readableBytes() >= 2) {
                paquete.readByte(); // 0D
                paquete.readByte(); // 0A
            }
        }
    }

}
