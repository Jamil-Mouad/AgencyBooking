package com.project.agent.dto;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserStatsDTO {
    private long totalReservations;
    private long completedReservations;
    private long pendingReservations;
    private long canceledReservations;
    private List<String> agenciesVisited;
}