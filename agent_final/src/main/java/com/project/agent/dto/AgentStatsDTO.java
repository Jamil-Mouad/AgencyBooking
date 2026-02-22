package com.project.agent.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class AgentStatsDTO {
    private int last24Hours;
    private int totalConfirmed;
    private int totalCompleted;
    private int totalCanceled;
}