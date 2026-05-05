package com.gpsromp.vehiculo;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Service;
import com.gpsromp.vehiculo.repository.VehiculoRepository;
import jakarta.transaction.Transactional;
import com.gpsromp.vehiculo.model.Vehiculo;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class VehiculoService {

    private final VehiculoRepository vehiculoRepository;

    public List<Vehiculo> ObtenerVehiculos() {
        return vehiculoRepository.findAll();
    }

    public Optional<Vehiculo> ObtenerVehiculosPorId(UUID id) {
        return vehiculoRepository.findById(id);
    }

    public Optional<Vehiculo> ObtenerVehiculoPorPlaca(String placa) {
        return vehiculoRepository.findByPlaca(placa);
    }

    public Optional<Vehiculo> obtenerVehiculoPorImei(String imei) {
        return vehiculoRepository.findByImei(imei);
    }

    public boolean existePlaca(String placa) {
        return vehiculoRepository.existsByPlaca(placa);
    }

    @Transactional
    public Vehiculo crearVehiculo(Vehiculo vehiculo) {
        return vehiculoRepository.save(vehiculo);
    }

    @Transactional
    public Vehiculo actualizarVehiculo(UUID id, Vehiculo vehiculoDetalles) {
        Vehiculo vehiculo = vehiculoRepository.findById(id).orElseThrow(() -> new RuntimeException("No se pudo encontrar el Vehiculo"));

        vehiculo.setActivo(vehiculoDetalles.isActivo());

        return vehiculoRepository.save(vehiculo);
    }


    @Transactional
    public void eliminarVehiculo(UUID id) {
        vehiculoRepository.deleteById(id);
    }

    @Transactional
    public void cambiarEstado(UUID id) {
        Vehiculo vehiculo = vehiculoRepository.findById(id)
        .orElseThrow(() -> new RuntimeException("No se encontro el Vehiculo"));

        vehiculo.setActivo(!vehiculo.isActivo());

        vehiculoRepository.save(vehiculo);
    }
}
