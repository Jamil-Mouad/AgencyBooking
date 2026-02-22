package com.project.agent.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UsernameUpdateRequest {
	
    @NotBlank
    private String username;
    
}