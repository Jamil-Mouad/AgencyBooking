package com.project.agent.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ContactMessageDTO {
    @NotBlank
    private String subject;
    
    @NotBlank
    @Size(max = 2000)
    private String message;
}