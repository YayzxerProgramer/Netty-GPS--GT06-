package com.gpsromp.vehiculo.controller;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.gpsromp.vehiculo.model.Vehiculo;
import com.gpsromp.vehiculo.service.VehiculoService;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.PutMapping;

@RestController
@RequestMapping("/vehiculo")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class VehiculoController {

    private final VehiculoService vehiculoService;

    @GetMapping
    public ResponseEntity<List<Vehiculo>> obtenerTodosLosVehiculos() {
        return ResponseEntity.ok(vehiculoService.ObtenerVehiculos());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Vehiculo> obtenerVehiculoPorId(@PathVariable UUID id) {
        return vehiculoService.ObtenerVehiculosPorId(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/placa/{placa}")
    public ResponseEntity<Vehiculo> obtenerVehiculoPorPlaca(@PathVariable String placa) {
        return vehiculoService.ObtenerVehiculoPorPlaca(placa)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/imei/{imei}")
    public ResponseEntity<Vehiculo> obtenerVehiculoPorImei(@PathVariable String imei) {
        return vehiculoService.obtenerVehiculoPorImei(imei)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> crearVehiculo(@RequestBody Vehiculo vehiculo) {
        if (vehiculoService.existePlaca(vehiculo.getPlaca())) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Ya hay un vehiculo registrado con esta Placa"));
        }
        Vehiculo nuevoVehiculo = vehiculoService.crearVehiculo(vehiculo);
        return ResponseEntity.status(HttpStatus.CREATED).body(nuevoVehiculo);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Vehiculo> actualizarVehiculo(@PathVariable UUID id, @RequestBody Vehiculo vehiculo) {
        try {
            Vehiculo actualizado = vehiculoService.actualizarVehiculo(id, vehiculo);
            return ResponseEntity.ok(actualizado);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminarVehiculo(@PathVariable UUID id) {
        vehiculoService.eliminarVehiculo(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/cambiar-estado")
    public ResponseEntity<Void> cambiarEstadoVehiculo(@PathVariable UUID id) {
        try {
            vehiculoService.cambiarEstado(id);
            return ResponseEntity.ok().build();
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
