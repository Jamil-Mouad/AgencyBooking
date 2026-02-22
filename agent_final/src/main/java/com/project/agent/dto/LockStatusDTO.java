package com.project.agent.dto;

import lombok.Data;

@Data
public class LockStatusDTO {
    private Long reservationId;
    private boolean locked;
    private Long agentId;
    private String agentName;
    private String agentEmail;
    private String lockMessage;
}