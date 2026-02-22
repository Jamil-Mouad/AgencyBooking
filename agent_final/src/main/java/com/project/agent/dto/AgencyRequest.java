package com.project.agent.dto;

import java.util.List;
import com.project.agent.model.Agency.BusinessHours;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AgencyRequest {
    @NotBlank
    private String name;
    
    @NotBlank
    private String address;
    
    @NotBlank
    private String phoneNumber;
    
    @NotBlank
    private String city;
    
    @Email
    private String email;
    
    private String description;
    
    private List<Integer> serviceIds;
    
    private List<BusinessHours> businessHours;
}