package com.project.agent.dto;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

import com.project.agent.model.Availability;
import lombok.Data;

@Data
public class AvailabilityDTO {
    private Long id;
    private Long agencyId;
    private String agencyName;
    private LocalDate date;
    private List<LocalTime> availableTimeSlots;
    private List<LocalTime> bookedTimeSlots;
    private Map<String, String> bookedSlotInfo; // Informations sur chaque créneau réservé (sans révéler de données sensibles)
    private boolean isPastDate;
    
    // Constructeur pour convertir depuis l'entité
    public AvailabilityDTO(Availability availability) {
        this.id = availability.getId();
        this.agencyId = availability.getAgency().getId();
        this.agencyName = availability.getAgency().getName();
        this.date = availability.getDate();
        this.availableTimeSlots = availability.getAvailableTimeSlots();
        this.bookedTimeSlots = availability.getBookedTimeSlots();
        this.isPastDate = LocalDate.now().isAfter(availability.getDate());
        
        // Initialisation de la map d'informations sur les créneaux réservés
        this.bookedSlotInfo = new HashMap<>();
    }
}