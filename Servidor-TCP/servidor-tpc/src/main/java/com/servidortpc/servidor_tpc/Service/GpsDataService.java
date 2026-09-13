package com.servidortpc.servidor_tpc.Service;

import java.util.Collection;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Service;

import com.servidortpc.servidor_tpc.Model.GPSData;

/**
 * Última posición conocida de cada dispositivo, en memoria.
 *
 * ARREGLO: antes era un único AtomicReference<GPSData>, es decir, UNA sola
 * posición global para todo el servidor. Con dos dispositivos conectados, cada
 * trama pisaba la del otro y la consulta devolvía cualquier cosa. Ahora es un
 * mapa por IMEI.
 *
 * Es solo una caché de conveniencia para diagnóstico: el histórico real vive en
 * MongoDB a través del BackEnd.
 */
@Service
public class GpsDataService {

    private final Map<String, GPSData> ultimaPosicion = new ConcurrentHashMap<>();

    public void recibirData(GPSData gpsData) {
        if (gpsData != null && gpsData.getImei() != null) {
            ultimaPosicion.put(gpsData.getImei(), gpsData);
        }
    }

    public Optional<GPSData> obtenerPorImei(String imei) {
        return Optional.ofNullable(ultimaPosicion.get(imei));
    }

    public Collection<GPSData> obtenerTodas() {
        return ultimaPosicion.values();
    }

    public int dispositivosConectados() {
        return ultimaPosicion.size();
    }
}
