package com.servidortpc.servidor_tpc.netty;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.ByteArrayOutputStream;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import io.netty.buffer.Unpooled;
import io.netty.channel.embedded.EmbeddedChannel;

/**
 * Pruebas del desencuadre de tramas.
 *
 * Cubren exactamente los tres fallos que hacían perder posiciones:
 * fragmentación TCP, dos tramas en el mismo segmento, y CRC sin validar.
 */
class DecodificadorTramaGt06Test {

    /** Construye una trama GT06 completa y bien formada. */
    private byte[] trama(byte protocolo, byte[] datos, short serial) {
        ByteArrayOutputStream cuerpo = new ByteArrayOutputStream();
        cuerpo.write(protocolo);
        cuerpo.writeBytes(datos);
        cuerpo.write((serial >> 8) & 0xFF);
        cuerpo.write(serial & 0xFF);

        byte[] bytesCuerpo = cuerpo.toByteArray();
        int longitud = bytesCuerpo.length + 2; // + CRC

        byte[] paraCrc = new byte[1 + bytesCuerpo.length];
        paraCrc[0] = (byte) longitud;
        System.arraycopy(bytesCuerpo, 0, paraCrc, 1, bytesCuerpo.length);
        int crc = GT06Utils.calcularCRC(paraCrc);

        ByteArrayOutputStream salida = new ByteArrayOutputStream();
        salida.write(0x78);
        salida.write(0x78);
        salida.write(longitud);
        salida.writeBytes(bytesCuerpo);
        salida.write((crc >> 8) & 0xFF);
        salida.write(crc & 0xFF);
        salida.write(0x0D);
        salida.write(0x0A);

        return salida.toByteArray();
    }

    private EmbeddedChannel canal() {
        return new EmbeddedChannel(new DecodificadorTramaGt06());
    }

    @Test
    @DisplayName("Una trama completa se decodifica")
    void tramaCompleta() {
        EmbeddedChannel canal = canal();
        byte[] datos = { 0x08, 0x69, 0x24, 0x70, 0x50, 0x00, 0x12, 0x34 };

        canal.writeInbound(Unpooled.wrappedBuffer(trama((byte) 0x01, datos, (short) 1)));

        TramaGt06 leida = canal.readInbound();
        assertNotNull(leida);
        assertTrue(leida.crcValido());
        assertEquals(0x01, leida.protocolo());
        assertEquals(1, leida.serial());
        assertEquals("0869247050001234", GT06Utils.decodificarIMEI(leida.datos()));
    }

    @Test
    @DisplayName("Una trama partida entre dos segmentos TCP no se pierde")
    void tramaFragmentada() {
        EmbeddedChannel canal = canal();
        byte[] completa = trama((byte) 0x01, new byte[] { 1, 2, 3, 4, 5, 6, 7, 8 }, (short) 9);

        // Primera mitad: todavía no hay nada que entregar.
        byte[] mitad1 = new byte[5];
        System.arraycopy(completa, 0, mitad1, 0, 5);
        canal.writeInbound(Unpooled.wrappedBuffer(mitad1));
        assertNull(canal.readInbound(), "No debe emitirse nada con la trama incompleta");

        // Segunda mitad: ahora sí.
        byte[] mitad2 = new byte[completa.length - 5];
        System.arraycopy(completa, 5, mitad2, 0, mitad2.length);
        canal.writeInbound(Unpooled.wrappedBuffer(mitad2));

        TramaGt06 leida = canal.readInbound();
        assertNotNull(leida, "La trama debe reconstruirse al llegar el resto");
        assertTrue(leida.crcValido());
        assertEquals(9, leida.serial());
    }

    @Test
    @DisplayName("Byte a byte también se reconstruye")
    void tramaByteAByte() {
        EmbeddedChannel canal = canal();
        byte[] completa = trama((byte) 0x13, new byte[] { 0x02, 0x40, 0x04, 0x00, 0x01 }, (short) 55);

        for (byte b : completa) {
            canal.writeInbound(Unpooled.wrappedBuffer(new byte[] { b }));
        }

        TramaGt06 leida = canal.readInbound();
        assertNotNull(leida);
        assertEquals(55, leida.serial());
    }

    @Test
    @DisplayName("Dos tramas en el mismo segmento se decodifican las dos")
    void dosTramasSeguidas() {
        EmbeddedChannel canal = canal();

        byte[] a = trama((byte) 0x01, new byte[] { 1, 2, 3, 4, 5, 6, 7, 8 }, (short) 1);
        byte[] b = trama((byte) 0x13, new byte[] { 0x02, 0x40, 0x04, 0x00, 0x01 }, (short) 2);

        ByteArrayOutputStream juntas = new ByteArrayOutputStream();
        juntas.writeBytes(a);
        juntas.writeBytes(b);

        canal.writeInbound(Unpooled.wrappedBuffer(juntas.toByteArray()));

        TramaGt06 primera = canal.readInbound();
        TramaGt06 segunda = canal.readInbound();

        assertNotNull(primera, "La primera trama debe llegar");
        // Esta es la que se perdía: el código anterior consumía dos bytes de
        // más y se comía el 78 78 de la trama siguiente.
        assertNotNull(segunda, "La SEGUNDA trama también debe llegar");

        assertEquals(0x01, primera.protocolo());
        assertEquals(0x13, segunda.protocolo());
        assertEquals(1, primera.serial());
        assertEquals(2, segunda.serial());
    }

    @Test
    @DisplayName("Una trama con el CRC alterado se marca como corrupta")
    void crcInvalido() {
        EmbeddedChannel canal = canal();
        byte[] t = trama((byte) 0x12, new byte[] { 1, 2, 3, 4, 5, 6, 7, 8 }, (short) 3);

        // Corromper un byte del CRC (los dos anteriores al 0D 0A).
        t[t.length - 3] = (byte) (t[t.length - 3] ^ 0xFF);

        canal.writeInbound(Unpooled.wrappedBuffer(t));

        TramaGt06 leida = canal.readInbound();
        assertNotNull(leida);
        assertFalse(leida.crcValido(), "El CRC alterado debe detectarse");
    }

    @Test
    @DisplayName("La basura previa no impide leer la trama siguiente")
    void resincronizaTrasBasura() {
        EmbeddedChannel canal = canal();

        ByteArrayOutputStream flujo = new ByteArrayOutputStream();
        flujo.writeBytes(new byte[] { 0x00, (byte) 0xFF, 0x12, 0x78 });
        flujo.writeBytes(trama((byte) 0x01, new byte[] { 1, 2, 3, 4, 5, 6, 7, 8 }, (short) 7));

        canal.writeInbound(Unpooled.wrappedBuffer(flujo.toByteArray()));

        TramaGt06 leida = canal.readInbound();
        assertNotNull(leida, "Debe resincronizar y encontrar la cabecera válida");
        assertEquals(7, leida.serial());
    }

    @Test
    @DisplayName("Una longitud absurda no cuelga el decodificador")
    void longitudAbsurda() {
        EmbeddedChannel canal = canal();

        // Cabecera válida seguida de una longitud imposible.
        canal.writeInbound(Unpooled.wrappedBuffer(
                new byte[] { 0x78, 0x78, (byte) 0xFF, 0x01, 0x02 }));

        assertNull(canal.readInbound(), "No debe emitir nada ni entrar en bucle");
    }
}
