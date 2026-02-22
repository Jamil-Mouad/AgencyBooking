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
import com.project.agent.service.EmailService;

@Component
public class ReminderScheduler {
    
    private static final Logger logger = LoggerFactory.getLogger(ReminderScheduler.class);
    
    @Autowired
    private ReservationRepository reservationRepository;
    
    @Autowired
    private EmailService emailService;
    
    @Autowired(required = false)
    private SimpMessagingTemplate messagingTemplate;
    
    /**
     * Vérifie toutes les heures les rendez-vous à venir et envoie des rappels
     * pour ceux prévus dans les 24 prochaines heures
     */
    @Scheduled(cron = "${scheduler.appointment-reminders.cron:0 0 * * * *}")
    @ConditionalOnProperty(name = "scheduler.appointment-reminders.enabled", havingValue = "true", matchIfMissing = true)
    public void sendAppointmentReminders() {
        logger.info("Exécution du planificateur de rappels de rendez-vous");
        
        // Définir la fenêtre de temps pour les rappels (prochaines 24 heures)
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime tomorrow = now.plusHours(24);
        
        // Récupérer les réservations confirmées dans cette fenêtre de temps
        List<Reservation> upcomingReservations = reservationRepository
                .findByStatusAndStartDateTimeBetween(Status.CONFIRMED, now, tomorrow);
        
        logger.info("Nombre de rendez-vous à venir dans les prochaines 24 heures: {}", upcomingReservations.size());
        
        for (Reservation reservation : upcomingReservations) {
            try {
                // Vérifier si le rappel a déjà été envoyé
                if (!reservation.isReminderSent()) {
                    // Envoyer le rappel
                    emailService.sendAppointmentReminder(reservation);
                    
                    // Marquer le rappel comme envoyé
                    reservation.setReminderSent(true);
                    reservationRepository.save(reservation);
                    
                    logger.info("Rappel envoyé pour la réservation ID: {}", reservation.getId());
                    
                    // Notification WebSocket (si disponible)
                    if (messagingTemplate != null) {
                        messagingTemplate.convertAndSend("/topic/reminder-sent", reservation.getId());
                    }
                }
            } catch (Exception e) {
                logger.error("Erreur lors de l'envoi du rappel pour la réservation ID {}: {}", 
                        reservation.getId(), e.getMessage());
            }
        }
    }
    
    /**
     * Envoie un rappel 1 heure avant le rendez-vous
     * Vérifie toutes les 15 minutes
     */
    @Scheduled(cron = "${scheduler.short-reminders.cron:0 */15 * * * *}")
    @ConditionalOnProperty(name = "scheduler.short-reminders.enabled", havingValue = "true", matchIfMissing = true)
    public void sendShortReminders() {
        logger.info("Vérification des rappels courts (1 heure avant)");
        
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime oneHourLater = now.plusHours(1);
        
        List<Reservation> upcomingReservations = reservationRepository
                .findByStatusAndStartDateTimeBetweenAndShortReminderSentFalse(
                    Status.CONFIRMED, now, oneHourLater);
        
        logger.info("Nombre de rendez-vous dans la prochaine heure: {}", upcomingReservations.size());
        
        for (Reservation reservation : upcomingReservations) {
            try {
                emailService.sendAppointmentReminder(reservation);
                
                reservation.setShortReminderSent(true);
                reservationRepository.save(reservation);
                
                logger.info("Rappel court envoyé pour la réservation ID: {}", reservation.getId());
            } catch (Exception e) {
                logger.error("Erreur lors de l'envoi du rappel court pour la réservation ID {}: {}", 
                        reservation.getId(), e.getMessage());
            }
        }
    }
    
    /**
     * Vérifie chaque jour les rendez-vous en attente expirés (plus de 7 jours sans confirmation)
     * et les annule automatiquement
     */
    @Scheduled(cron = "${scheduler.abandoned-reservations-cleanup.cron:0 0 0 * * *}")
    @ConditionalOnProperty(name = "scheduler.abandoned-reservations-cleanup.enabled", havingValue = "true", matchIfMissing = true)
    public void cancelExpiredPendingReservations() {
        logger.info("Vérification des réservations en attente expirées");
        
        // Définir la date limite (7 jours dans le passé)
        LocalDateTime expirationThreshold = LocalDateTime.now().minusDays(7);
        
        // Récupérer les réservations en attente créées avant la date limite
        List<Reservation> expiredReservations = reservationRepository
                .findByStatusAndCreatedAtBefore(Status.PENDING, expirationThreshold);
        
        logger.info("Nombre de réservations en attente expirées: {}", expiredReservations.size());
        
        for (Reservation reservation : expiredReservations) {
            try {
                // Annuler la réservation
                reservation.setStatus(Status.CANCELED);
                reservation.setUpdatedAt(LocalDateTime.now());
                
                // Ajouter une note indiquant l'annulation automatique
                String newDescription = reservation.getDescription() + 
                        "\n\nAutomatiquement annulée après 7 jours sans confirmation.";
                reservation.setDescription(newDescription);
                
                reservationRepository.save(reservation);
                
                // Notifier le client
                emailService.sendReservationCancellation(
                        reservation, 
                        "Annulation automatique après 7 jours sans confirmation d'un agent.");
                
                logger.info("Réservation ID {} annulée automatiquement", reservation.getId());
                
                // Notification WebSocket (si disponible)
                if (messagingTemplate != null) {
                    messagingTemplate.convertAndSend("/topic/reservation-updated", reservation);
                }
            } catch (Exception e) {
                logger.error("Erreur lors de l'annulation automatique de la réservation ID {}: {}", 
                        reservation.getId(), e.getMessage());
            }
        }
    }
}