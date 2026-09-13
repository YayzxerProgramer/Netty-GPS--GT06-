package com.gpsromp.common.dto;

import org.springframework.data.domain.Page;

import java.util.List;
import java.util.function.Function;

/**
 * Envoltorio de paginación estable.
 *
 * Se usa en lugar de devolver Page<T> directamente porque la serialización de
 * PageImpl por Jackson no tiene contrato garantizado entre versiones de Spring
 * (de hecho Spring Boot 3.3+ ya emite un warning al respecto).
 *
 * @param contenido  elementos de la página actual
 * @param pagina     índice de página, base 0
 * @param tamano     tamaño de página solicitado
 * @param totalElementos  total de registros que cumplen el filtro
 * @param totalPaginas    número de páginas
 * @param primera    true si es la primera página
 * @param ultima     true si es la última página
 */
public record PaginaResponse<T>(
        List<T> contenido,
        int pagina,
        int tamano,
        long totalElementos,
        int totalPaginas,
        boolean primera,
        boolean ultima) {

    /** Convierte un Page de entidades en una PaginaResponse de DTOs. */
    public static <E, D> PaginaResponse<D> de(Page<E> page, Function<E, D> mapeador) {
        return new PaginaResponse<>(
                page.getContent().stream().map(mapeador).toList(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages(),
                page.isFirst(),
                page.isLast());
    }
}
