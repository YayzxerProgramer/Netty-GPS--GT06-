package com.servidortpc.servidor_tpc.netty;

import java.util.List;

import io.netty.buffer.ByteBuf;
import io.netty.channel.ChannelHandlerContext;
import io.netty.handler.codec.ByteToMessageDecoder;

/**
 * Extrae tramas GT06 completas del flujo TCP.
 *
 * ARREGLA TRES FALLOS QUE HACÍAN PERDER POSICIONES:
 *
 * 1. PAQUETES FRAGMENTADOS. El handler anterior hacía resetReaderIndex() y
 *    return cuando faltaban bytes, dando por hecho que se volverían a entregar.
 *    Pero SimpleChannelInboundHandler libera el ByteBuf al salir y no había
 *    ningún decodificador en el pipeline, así que toda trama partida entre dos
 *    segmentos TCP se descartaba entera. ByteToMessageDecoder sí acumula: es
 *    exactamente la clase que Netty ofrece para esto.
 *
 * 2. DOS BYTES DE MÁS POR TRAMA. En GT06 el byte de longitud incluye el CRC.
 *    El código leía el contenido, luego el 0D 0A, y después DOS BYTES MÁS que
 *    en realidad eran el 78 78 de la trama siguiente. Con dos paquetes en el
 *    mismo segmento TCP, el segundo se perdía.
 *
 * 3. CRC SIN VALIDAR. Se leía y se descartaba, así que cualquier trama corrupta
 *    se procesaba como buena. Aquí se comprueba y las corruptas se descartan.
 *
 * Estructura de la trama:
 *
 *   78 78 | LEN | PROTO | ...datos... | SERIAL(2) | CRC(2) | 0D 0A
 *           \_____________ LEN cuenta desde PROTO hasta CRC ______/
 */
public class DecodificadorTramaGt06 extends ByteToMessageDecoder {

    private static final int INICIO_1 = 0x78;
    private static final int INICIO_2 = 0x78;
    private static final int FIN_1 = 0x0D;
    private static final int FIN_2 = 0x0A;

    /** Una trama GT06 legítima nunca se acerca a esto; sirve de cortafuegos. */
    private static final int LONGITUD_MAXIMA = 512;

    @Override
    protected void decode(ChannelHandlerContext contexto, ByteBuf entrada, List<Object> salida) {

        while (true) {
            // Cabecera + longitud, como mínimo, para saber cuánto falta.
            if (entrada.readableBytes() < 3) {
                return;
            }

            entrada.markReaderIndex();

            int b1 = entrada.readUnsignedByte();
            int b2 = entrada.readUnsignedByte();

            if (b1 != INICIO_1 || b2 != INICIO_2) {
                // Resincronizar: retroceder y avanzar un solo byte para buscar
                // la siguiente cabecera sin saltarse una válida.
                entrada.resetReaderIndex();
                entrada.skipBytes(1);
                continue;
            }

            int longitud = entrada.readUnsignedByte();

            if (longitud < 1 || longitud > LONGITUD_MAXIMA) {
                // Longitud absurda: la cabecera era casualidad dentro de datos.
                entrada.resetReaderIndex();
                entrada.skipBytes(1);
                continue;
            }

            // longitud cubre PROTO..CRC; faltan además los 2 bytes de cierre.
            if (entrada.readableBytes() < longitud + 2) {
                entrada.resetReaderIndex();

                // Puede ser una trama incompleta (hay que esperar) o una cabecera
                // falsa dentro de los datos (hay que resincronizar). Distinguirlo
                // importa: si era falsa y nos quedamos esperando los bytes que
                // anuncia, la conexión se bloquea para siempre.
                //
                // Criterio: si más adelante en el buffer hay otro 78 78, la
                // cabecera actual era ruido y se avanza un byte. Si equivocamos
                // la elección, el cierre 0D 0A y el CRC lo detectan y se vuelve
                // a resincronizar; no se procesa nada corrupto como válido.
                if (hayOtraCabecera(entrada)) {
                    entrada.skipBytes(1);
                    continue;
                }
                return;
            }

            // Cuerpo sin el CRC: PROTO + datos + serial.
            int longitudCuerpo = longitud - 2;
            byte[] cuerpo = new byte[longitudCuerpo];
            entrada.readBytes(cuerpo);

            int crcRecibido = entrada.readUnsignedShort();

            int fin1 = entrada.readUnsignedByte();
            int fin2 = entrada.readUnsignedByte();

            if (fin1 != FIN_1 || fin2 != FIN_2) {
                entrada.resetReaderIndex();
                entrada.skipBytes(1);
                continue;
            }

            // El CRC se calcula sobre longitud + cuerpo.
            byte[] paraCrc = new byte[1 + longitudCuerpo];
            paraCrc[0] = (byte) longitud;
            System.arraycopy(cuerpo, 0, paraCrc, 1, longitudCuerpo);

            int crcCalculado = GT06Utils.calcularCRC(paraCrc);

            if (crcCalculado != crcRecibido) {
                // Trama corrupta: se descarta en vez de procesarla como buena.
                salida.add(TramaGt06.corrupta(cuerpo[0], crcRecibido, crcCalculado));
                continue;
            }

            salida.add(TramaGt06.valida(cuerpo));
        }
    }

    /**
     * ¿Existe otra cabecera 78 78 después de la posición actual?
     *
     * Se busca a partir del byte siguiente al inicio de la cabecera candidata,
     * de modo que la secuencia 78 78 78 (basura terminada en 0x78 seguida de una
     * cabecera real) se resuelva a favor de la cabecera real.
     */
    private boolean hayOtraCabecera(ByteBuf entrada) {
        int inicio = entrada.readerIndex() + 1;
        int fin = entrada.writerIndex() - 1;

        for (int i = inicio; i < fin; i++) {
            if (entrada.getUnsignedByte(i) == INICIO_1
                    && entrada.getUnsignedByte(i + 1) == INICIO_2) {
                return true;
            }
        }
        return false;
    }
}
