package com.gpsromp.usuario.model;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.junit.jupiter.api.Test;

class RolConverterTest {

    private final RolConverter conversor = new RolConverter();

    @Test
    void leeLosRolesActuales() {
        assertEquals(Rol.ADMIN, conversor.convertToEntityAttribute("ADMIN"));
        assertEquals(Rol.USER, conversor.convertToEntityAttribute("USER"));
        assertEquals(Rol.VIEWER, conversor.convertToEntityAttribute("VIEWER"));
    }

    @Test
    void toleraMayusculasYEspacios() {
        assertEquals(Rol.ADMIN, conversor.convertToEntityAttribute(" admin "));
    }

    @Test
    void traduceLosRolesHeredados() {
        assertEquals(Rol.USER, conversor.convertToEntityAttribute("USUARIO"));
        assertEquals(Rol.USER, conversor.convertToEntityAttribute("cliente"));
        assertEquals(Rol.ADMIN, conversor.convertToEntityAttribute("ROLE_ADMIN"));
    }

    /** Un valor desconocido nunca debe conceder más acceso que el de un cliente. */
    @Test
    void loDesconocidoOVacioEsUser() {
        assertEquals(Rol.USER, conversor.convertToEntityAttribute("SUPERJEFE"));
        assertEquals(Rol.USER, conversor.convertToEntityAttribute(""));
        assertEquals(Rol.USER, conversor.convertToEntityAttribute(null));
    }

    @Test
    void escribeElNombreDelEnum() {
        assertEquals("VIEWER", conversor.convertToDatabaseColumn(Rol.VIEWER));
        assertNull(conversor.convertToDatabaseColumn(null));
    }
}
