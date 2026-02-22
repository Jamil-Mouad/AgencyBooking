package com.project.agent.dto;

import lombok.Data;

@Data
public class ReservationCancellationRequest {
    private String reason; // Raison facultative de l'annulation
}