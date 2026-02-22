package com.project.agent.scheduler;

import java.time.LocalDateTime;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.project.agent.model.Reservation;
import com.project.agent.model.Reservation.Status;
import com.project.agent.repository.ReservationRepository;

@Component
@ConditionalOnProperty(name = "scheduler.imminent-appointments-check.enabled", havingValue = "true", matchIfMissing = true)
public class AppointmentReminderScheduler {
    
    private static final Logger logger = LoggerFactory.getLogger(AppointmentReminderScheduler.class);
    
    @Autowired
    private ReservationRepository reservationRepository;
    
    @Autowired
    private SimpMessagingTemplate messagingTemplate;
    
    /**
     * Vérifie les rendez-vous imminents et envoie une notification aux agents
     * Exécuté toutes les 15 minutes
     */
    @Scheduled(cron = "${scheduler.imminent-appointments-check.cron:0 */15 * * * *}")
    public void notifyUpcomingAppointments() {
        logger.info("Vérification des rendez-vous imminents");
        
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime soon = now.plusHours(1); // Rendez-vous dans l'heure qui vient
        
        // Trouver les rendez-vous qui commencent dans l'heure
        List<Reservation> imminentAppointments = reservationRepository.findByStatusAndStartDateTimeBetween(
                Status.CONFIRMED,
                now,
                soon
        );
        
        if (!imminentAppointments.isEmpty()) {
            logger.info("Notification pour {} rendez-vous imminents", imminentAppointments.size());
            
            // Envoyer une notification aux agents via WebSocket
            messagingTemplate.convertAndSend("/topic/imminent-appointments", imminentAppointments);
        }
    }
}