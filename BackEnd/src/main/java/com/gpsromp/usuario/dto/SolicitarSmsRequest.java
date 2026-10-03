package com.gpsromp.usuario.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class SolicitarSmsRequest {

    @NotBlank(message = "El número telefónico es obligatorio")
    @Pattern(regexp = "^\\+?[0-9]{7,15}$", message = "El formato de teléfono debe ser válido (ej. +573001234567)")
    private String telefono;
}
