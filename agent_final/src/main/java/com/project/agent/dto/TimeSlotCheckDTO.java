package com.project.agent.dto;

import java.time.LocalDate;
import java.time.LocalTime;
import lombok.Data;

@Data
public class TimeSlotCheckDTO {
    private Long agencyId;
    private LocalDate date;
    private LocalTime time;
    private boolean available;
    private String message;
}