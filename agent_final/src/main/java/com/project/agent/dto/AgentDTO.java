package com.project.agent.dto;

import lombok.Data;

@Data
public class AgentDTO {
    private Long id;
    private String username;
    private String email;
    private Long agencyId;
    private String agencyName;
    private boolean available;
}