package com.project.agent.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ServiceOfferingRequest {
    @NotBlank
    private String name;
}