package com.gpsromp.admin.dto;

/**
 * Métricas de cabecera del panel (GET /admin/resumen).
 *
 * Alimenta las cuatro stat cards de Dashboard.jsx, que hoy muestran literales
 * hardcodeados (TOTAL CLIENTS 412, GPS INVENTORY 8,924, ACTIVE SIGNAL 94.2%).
 *
 * Todos los valores salen de consultas COUNT, no de traerse las tablas enteras
 * y contarlas en memoria.
 *
 * @param totalUsuarios      usuarios registrados
 * @param usuariosActivos    usuarios con activo = true
 * @param administradores    usuarios con rol ADMIN
 * @param totalVehiculos     vehículos registrados
 * @param vehiculosActivos   vehículos con activo = true
 * @param vehiculosConImei   vehículos con un GPS asignado
 * @param vehiculosSinDuenno vehículos sin propietario asignado
 */
public record ResumenAdminResponse(
        long totalUsuarios,
        long usuariosActivos,
        long administradores,
        long totalVehiculos,
        long vehiculosActivos,
        long vehiculosConImei,
        long vehiculosSinDuenno) {
}
