package com.project.agent.model;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonIdentityInfo;
import com.fasterxml.jackson.annotation.ObjectIdGenerators;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import lombok.Data;

@Entity
@Data
@JsonIdentityInfo(generator = ObjectIdGenerators.PropertyGenerator.class, property = "id")
public class Availability {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne
    @JoinColumn(name = "agency_id")
    private Agency agency;
    
    @Column(nullable = false)
    private LocalDate date;
    
    // Utiliser des getters et setters pour convertir entre String et List<LocalTime>
    @Column(name = "available_time_slots", columnDefinition = "text")
    private String availableTimeSlotsString = "";
    
    @Column(name = "booked_time_slots", columnDefinition = "text")
    private String bookedTimeSlotsString = "";
    
    // Getters et setters pour la conversion
    public List<LocalTime> getAvailableTimeSlots() {
        if (availableTimeSlotsString == null || availableTimeSlotsString.isEmpty()) {
            return new ArrayList<>();
        }
        
        List<LocalTime> result = new ArrayList<>();
        for (String timeStr : availableTimeSlotsString.split(",")) {
            if (!timeStr.trim().isEmpty()) {
                result.add(LocalTime.parse(timeStr.trim()));
            }
        }
        return result;
    }
    
    public void setAvailableTimeSlots(List<LocalTime> availableTimeSlots) {
        if (availableTimeSlots == null || availableTimeSlots.isEmpty()) {
            this.availableTimeSlotsString = "";
            return;
        }
        
        StringBuilder sb = new StringBuilder();
        for (LocalTime time : availableTimeSlots) {
            if (sb.length() > 0) {
                sb.append(",");
            }
            sb.append(time.toString());
        }
        this.availableTimeSlotsString = sb.toString();
    }
    
    public List<LocalTime> getBookedTimeSlots() {
        if (bookedTimeSlotsString == null || bookedTimeSlotsString.isEmpty()) {
            return new ArrayList<>();
        }
        
        List<LocalTime> result = new ArrayList<>();
        for (String timeStr : bookedTimeSlotsString.split(",")) {
            if (!timeStr.trim().isEmpty()) {
                result.add(LocalTime.parse(timeStr.trim()));
            }
        }
        return result;
    }
    
    public void setBookedTimeSlots(List<LocalTime> bookedTimeSlots) {
        if (bookedTimeSlots == null || bookedTimeSlots.isEmpty()) {
            this.bookedTimeSlotsString = "";
            return;
        }
        
        StringBuilder sb = new StringBuilder();
        for (LocalTime time : bookedTimeSlots) {
            if (sb.length() > 0) {
                sb.append(",");
            }
            sb.append(time.toString());
        }
        this.bookedTimeSlotsString = sb.toString();
    }
}