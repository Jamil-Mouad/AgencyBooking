package com.project.agent.dto;

import java.time.LocalDate;
import java.time.LocalTime;
import lombok.Data;

/**
 * DTO pour la gestion des créneaux horaires (blocage/déblocage)
 */
@Data
public class TimeSlotManagementDTO {
    private Long agencyId;
    private LocalDate date;
    private LocalTime time;
    private boolean blocked;
    private String reason;
    private String agentName;
}