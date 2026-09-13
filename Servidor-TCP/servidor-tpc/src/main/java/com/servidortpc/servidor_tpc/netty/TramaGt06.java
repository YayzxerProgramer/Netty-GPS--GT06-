package com.servidortpc.servidor_tpc.netty;

import java.util.Arrays;

/**
 * Una trama GT06 ya desencuadrada y con el CRC comprobado.
 *
 * El cuerpo es PROTO + datos + serial (2 bytes), sin cabecera, sin longitud,
 * sin CRC y sin el cierre 0D 0A: el handler solo se ocupa de interpretar el
 * contenido, no del encuadre.
 */
public final class TramaGt06 {

    private final byte[] cuerpo;
    private final boolean crcValido;
    private final int crcRecibido;
    private final int crcCalculado;

    private TramaGt06(byte[] cuerpo, boolean crcValido, int crcRecibido, int crcCalculado) {
        this.cuerpo = cuerpo;
        this.crcValido = crcValido;
        this.crcRecibido = crcRecibido;
        this.crcCalculado = crcCalculado;
    }

    public static TramaGt06 valida(byte[] cuerpo) {
        return new TramaGt06(cuerpo, true, 0, 0);
    }

    public static TramaGt06 corrupta(byte protocolo, int crcRecibido, int crcCalculado) {
        return new TramaGt06(new byte[] { protocolo }, false, crcRecibido, crcCalculado);
    }

    /** Byte de protocolo: 0x01 login, 0x12 ubicación, 0x13 heartbeat, 0x16 estado. */
    public byte protocolo() {
        return cuerpo[0];
    }

    /** Datos del protocolo, sin el byte de protocolo ni el serial final. */
    public byte[] datos() {
        int fin = Math.max(1, cuerpo.length - 2);
        return Arrays.copyOfRange(cuerpo, 1, fin);
    }

    /**
     * Número de serie de la trama, siempre los dos últimos bytes del cuerpo.
     *
     * Leerlo por posición arregla el ACK de heartbeat: la versión anterior lo
     * leía secuencialmente después de dos campos mal identificados (etiquetaba
     * el voltaje como señal GSM) y acababa devolviendo como serial los bytes
     * [gsmSignal, alarmHi], es decir, un serial inventado.
     */
    public short serial() {
        if (cuerpo.length < 3) {
            return 0;
        }
        return (short) (((cuerpo[cuerpo.length - 2] & 0xFF) << 8)
                | (cuerpo[cuerpo.length - 1] & 0xFF));
    }

    public boolean crcValido() {
        return crcValido;
    }

    public int crcRecibido() {
        return crcRecibido;
    }

    public int crcCalculado() {
        return crcCalculado;
    }

    public byte[] cuerpo() {
        return cuerpo;
    }
}
