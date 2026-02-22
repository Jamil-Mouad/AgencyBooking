package com.project.agent.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ReservationRequest {
    @NotBlank
    private String service;
    
    @NotBlank
    private String description;
    
    // Date souhaitée (facultatif, car l'agent fixera la date définitive)
    private String preferredDate;

    // Heure préférée au format HH:mm (facultatif)
    private String preferredTime;

    @NotNull
    private Long agencyId;
}

