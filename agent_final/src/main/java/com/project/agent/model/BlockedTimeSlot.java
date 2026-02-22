package com.project.agent.model;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.persistence.Index;
import lombok.Data;

@Entity
@Table(
    name = "blocked_time_slots",
    uniqueConstraints = {
        @UniqueConstraint(columnNames = {"agency_id", "date", "time"})
    },
    indexes = {
        @Index(name = "idx_blocked_timeslots_agency_date", columnList = "agency_id, date")
    }
)
@Data
public class BlockedTimeSlot {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne
    @JoinColumn(name = "agency_id", nullable = false)
    @JsonIgnoreProperties({"agents", "services", "businessHours", "hibernateLazyInitializer", "handler"})
    private Agency agency;
    
    private LocalDate date;
    
    private LocalTime time;
    
    private String reason;
    
    @ManyToOne
    @JoinColumn(name = "blocked_by")
    @JsonIgnoreProperties({"user", "agency", "hibernateLazyInitializer", "handler"})
    private Agent blockedBy;
    
    private LocalDateTime blockedAt;
}