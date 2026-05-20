package com.gpsromp.vehiculo.service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Service;

import com.gpsromp.vehiculo.model.Vehiculo;
import com.gpsromp.vehiculo.repository.VehiculoRepository;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.CacheEvict;

@Service
@RequiredArgsConstructor
@Transactional
public class VehiculoService {

    private final VehiculoRepository vehiculoRepository;

    @Cacheable(value = "vehiculos")
    public List<Vehiculo> ObtenerVehiculos() {
        return vehiculoRepository.findAll();
    }

    @Cacheable(value = "vehiculos", key = "#id")
    public Optional<Vehiculo> ObtenerVehiculosPorId(UUID id) {
        return vehiculoRepository.findById(id);
    }

    @Cacheable(value = "vehiculos", key = "#placa")
    public Optional<Vehiculo> ObtenerVehiculoPorPlaca(String placa) {
        return vehiculoRepository.findByPlaca(placa);
    }

    @Cacheable(value = "vehiculos", key = "#imei")
    public Optional<Vehiculo> obtenerVehiculoPorImei(String imei) {
        return vehiculoRepository.findByImei(imei);
    }

    public boolean existePlaca(String placa) {
        return vehiculoRepository.existsByPlaca(placa);
    }

    @Transactional
    @CacheEvict(value = "vehiculos", allEntries = true)
    public Vehiculo crearVehiculo(Vehiculo vehiculo) {
        return vehiculoRepository.save(vehiculo);
    }

    @Transactional
    @CacheEvict(value = "vehiculos", allEntries = true)
    public Vehiculo actualizarVehiculo(UUID id, Vehiculo vehiculoDetalles) {
        Vehiculo vehiculo = vehiculoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("No se pudo encontrar el Vehiculo"));
        vehiculo.setPlaca(vehiculoDetalles.getPlaca());
        vehiculo.setImei(vehiculoDetalles.getImei());
        vehiculo.setModelo(vehiculoDetalles.getModelo());
        vehiculo.setTipo(vehiculoDetalles.getTipo());
        vehiculo.setActivo(vehiculoDetalles.getActivo());
        vehiculo.setId_usuario(vehiculoDetalles.getId_usuario());
        return vehiculoRepository.save(vehiculo);
    }

    @Transactional
    @CacheEvict(value = "vehiculos", allEntries = true)
    public void eliminarVehiculo(UUID id) {
        vehiculoRepository.deleteById(id);
    }

    @Transactional
    @CacheEvict(value = "vehiculos", allEntries = true)
    public void cambiarEstado(UUID id) {
        Vehiculo vehiculo = vehiculoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("No se encontro el Vehiculo"));
        vehiculo.setActivo(!vehiculo.getActivo());
        vehiculoRepository.save(vehiculo);
    }
}