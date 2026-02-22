package com.project.agent.scheduler;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.project.agent.dto.AvailabilityDTO;
import com.project.agent.model.Availability;
import com.project.agent.repository.AvailabilityRepository;
import com.project.agent.service.AvailabilityService;

@Service
public class AvailabilityScheduler {
    
    @Autowired
    private SimpMessagingTemplate messagingTemplate;
    
    @Autowired
    private AvailabilityRepository availabilityRepository;
    
    @Autowired
    private AvailabilityService availabilityService;
    
    // Vérifier toutes les minutes pour les créneaux passés
    @Scheduled(fixedRateString = "${scheduler.availability-check.interval-ms:60000}")
    @ConditionalOnProperty(name = "scheduler.availability-check.enabled", havingValue = "true", matchIfMissing = true)
    public void checkPassedTimeSlots() {
        LocalDate today = LocalDate.now();
        LocalTime now = LocalTime.now();
        
        // Rechercher toutes les disponibilités pour aujourd'hui
        List<Availability> todayAvailabilities = availabilityRepository.findByDate(today);
        
        for (Availability availability : todayAvailabilities) {
            boolean updated = false;
            List<LocalTime> availableSlots = new ArrayList<>(availability.getAvailableTimeSlots());
            
            // Vérifier les créneaux qui sont maintenant passés
            for (LocalTime slot : availableSlots) {
                if (slot.isBefore(now) || slot.equals(now)) {
                    availability.getAvailableTimeSlots().remove(slot);
                    availability.getBookedTimeSlots().add(slot); // Optionnel: marquer comme "réservé"
                    updated = true;
                }
            }
            
            if (updated) {
                // Enregistrer les changements
                Availability savedAvailability = availabilityRepository.save(availability);
                
                // Envoyer une notification à tous les clients
                AvailabilityDTO dto = new AvailabilityDTO(savedAvailability);
                // Enrichir le DTO si nécessaire
                if (availabilityService != null) {
                    availabilityService.enrichAvailabilityDTO(dto);
                }
                messagingTemplate.convertAndSend("/topic/availability/" + availability.getAgency().getId(), dto);
            }
        }
    }
    
    // Ajouter de nouvelles méthodes planifiées
    @Scheduled(cron = "${scheduler.future-availability-generation.cron:0 0 0 * * *}")
    @ConditionalOnProperty(name = "scheduler.future-availability-generation.enabled", havingValue = "true", matchIfMissing = true)
    public void generateFutureAvailabilities() {
        // Implémentation...
    }
    
    @Scheduled(cron = "${scheduler.old-availability-archiving.cron:0 0 1 * * SUN}")
    @ConditionalOnProperty(name = "scheduler.old-availability-archiving.enabled", havingValue = "true", matchIfMissing = true)
    public void archiveOldAvailabilities() {
        // Implémentation...
    }
}