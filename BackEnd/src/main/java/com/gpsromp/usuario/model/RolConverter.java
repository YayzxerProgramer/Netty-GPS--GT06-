package com.gpsromp.usuario.model;

import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import lombok.extern.slf4j.Slf4j;

/**
 * Lee la columna "rol" sin reventar ante valores que no son del enum.
 *
 * POR QUÉ: con @Enumerated(EnumType.STRING) una sola fila con un rol antiguo
 * ("USUARIO", "CLIENTE"...) hacía fallar con un 500 cualquier consulta que la
 * cargara: el listado de usuarios, el detalle del propietario de un vehículo,
 * el buscador del panel...
 *
 * Un valor desconocido se trata como USER, el rol con menos privilegios: nunca
 * se concede acceso que la fila no tuviera. NormalizadorEsquema corrige además
 * esos valores en la base de datos al arrancar.
 */
@Converter
@Slf4j
public class RolConverter implements AttributeConverter<Rol, String> {

    /** Cada valor desconocido se avisa una sola vez, no en cada fila leída. */
    private static final Set<String> AVISADOS = ConcurrentHashMap.newKeySet();

    @Override
    public String convertToDatabaseColumn(Rol rol) {
        return rol == null ? null : rol.name();
    }

    @Override
    public Rol convertToEntityAttribute(String valor) {
        return Rol.interpretar(valor).orElseGet(() -> {
            if (AVISADOS.add(String.valueOf(valor))) {
                log.warn("Rol desconocido en la base de datos: '{}'. Se trata como USER.", valor);
            }
            return Rol.USER;
        });
    }
}
