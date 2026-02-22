package com.project.agent.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class NewPasswordRequest {
    @NotBlank
    private String email;
    
    @NotBlank
    private String code;
    
    @NotBlank
    @Size(min = 8, max = 100)
    private String newPassword;
    
    @NotBlank
    @Size(min = 8, max = 100)
    private String confirmPassword;
}