package com.gpsromp.usuario.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class VerificarSmsRequest {

    @NotBlank(message = "El número telefónico es obligatorio")
    @Pattern(regexp = "^\\+?[0-9]{7,15}$", message = "El formato de teléfono debe ser válido (ej. +573001234567)")
    private String telefono;

    @NotBlank(message = "El código OTP es obligatorio")
    @Pattern(regexp = "^[0-9]{6}$", message = "El código debe ser de 6 dígitos numéricos")
    private String codigo;
}
