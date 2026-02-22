package com.project.agent.service;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.Arrays;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import com.project.agent.dto.ReservationRequest;
import com.project.agent.model.Agency;
import com.project.agent.model.Agent;
import com.project.agent.model.Reservation;
import com.project.agent.model.Users;
import com.project.agent.model.Reservation.Status;
import com.project.agent.repository.AgencyRepository;
import com.project.agent.repository.AgentRepository;
import com.project.agent.repository.ReservationRepository;
import com.project.agent.repository.UserRepository;

import org.springframework.transaction.annotation.Transactional;

@Service
public class ReservationService {
    private static final Logger logger = LoggerFactory.getLogger(ReservationService.class);
    
    @Autowired
    private ReservationRepository reservationRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private AgencyRepository agencyRepository;
    
    @Autowired
    private AgentRepository agentRepository;
    
    @Autowired
    private AvailabilityService availabilityService;
    
    @Autowired
    private SimpMessagingTemplate messagingTemplate;
    
    /**
     * Vérifie si un utilisateur a déjà une réservation active (en attente ou confirmée)
     * @param user L'utilisateur à vérifier
     * @return true si l'utilisateur a une réservation active, false sinon
     */
    public boolean hasActiveReservation(Users user) {
        List<Status> activeStatuses = Arrays.asList(Status.PENDING, Status.CONFIRMED);
        List<Reservation> activeReservations = reservationRepository.findByUserAndStatusIn(user, activeStatuses);
        return !activeReservations.isEmpty();
    }
    
    // Create a reservation
    @Transactional
    public Reservation createReservation(ReservationRequest reservationRequest) {
        logger.info("Création d'une réservation: {}", reservationRequest);
        
        // Récupérer l'utilisateur connecté
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        
        Users user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
        
        // Vérifier si l'utilisateur a déjà une réservation active
        if (hasActiveReservation(user)) {
            throw new RuntimeException("Vous avez déjà une réservation active. Pour les services de voyage, vous ne pouvez avoir qu'une seule réservation à la fois. Veuillez attendre que votre réservation actuelle soit complétée ou annulée avant d'en faire une nouvelle.");
        }
        
        // Get the agency
        Agency agency = agencyRepository.findById(reservationRequest.getAgencyId())
                .orElseThrow(() -> new RuntimeException("Agency not found"));
        
        Reservation reservation = new Reservation();
        reservation.setUser(user);
        reservation.setAgency(agency);
        reservation.setService(reservationRequest.getService());
        reservation.setDescription(reservationRequest.getDescription());
        // If a preferred time is provided, append it to the preferred date
        String preferredDate = reservationRequest.getPreferredDate();
        if (reservationRequest.getPreferredTime() != null && !reservationRequest.getPreferredTime().isEmpty()) {
            preferredDate = preferredDate + "T" + reservationRequest.getPreferredTime() + ":00";
        }
        reservation.setPreferredDate(preferredDate);
        reservation.setStatus(Status.PENDING);
        reservation.setCreatedAt(LocalDateTime.now());
        reservation.setHandledByAgent(null); // Initialement, aucun agent n'a traité cette réservation
        
        Reservation savedReservation = reservationRepository.save(reservation);
        logger.info("Réservation enregistrée avec l'ID: {}", savedReservation.getId());
        
        // Mettre à jour les disponibilités immédiatement si une date préférée est spécifiée
        if (reservationRequest.getPreferredDate() != null && !reservationRequest.getPreferredDate().isEmpty()) {
            try {
                LocalDateTime preferredDateTime = LocalDateTime.parse(reservationRequest.getPreferredDate());
                logger.info("Marquage du créneau comme temporairement réservé: {}", preferredDateTime);
                // Marquer temporairement le créneau comme indisponible jusqu'à confirmation
                availabilityService.markTimeSlotAsTemporarilyBooked(agency, preferredDateTime);
            } catch (DateTimeParseException e) {
                logger.error("Erreur lors du parsing de la date préférée: {}", e.getMessage());
            }
        }
        
        // Notifier les agents en temps réel
        logger.info("Envoi de notification WebSocket pour la nouvelle réservation");
        messagingTemplate.convertAndSend("/topic/reservations", savedReservation);
        
        return savedReservation;
    }
    
    public List<Reservation> getPendingReservations() {
        return reservationRepository.findByStatus(Status.PENDING);
    }
    
    @Transactional
    public Reservation confirmReservation(Long reservationId, LocalDateTime startDateTime, LocalDateTime endDateTime, String messageToClient) {
        logger.info("Confirmation de la réservation: {}", reservationId);
        
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new RuntimeException("Réservation non trouvée"));
        
        // Vérifier que la réservation est en attente
        if (reservation.getStatus() != Status.PENDING) {
            throw new RuntimeException("Cette réservation n'est pas en attente de confirmation");
        }
        
        // Vérifier les dates
        if (startDateTime.isAfter(endDateTime)) {
            throw new RuntimeException("La date de début doit être avant la date de fin");
        }
        
        // Récupérer l'agent qui effectue l'action
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        
        Users user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
        
        Agent agent = agentRepository.findByUser(user)
                .orElseThrow(() -> new RuntimeException("Agent non trouvé"));
        
        // Enregistrer l'agent qui traite cette réservation
        reservation.setHandledByAgent(agent);
        
        // Ajouter le message du client si présent
        if (messageToClient != null && !messageToClient.trim().isEmpty()) {
            // Option 1: Ajouter à la description existante
            reservation.setDescription(reservation.getDescription() + "\n\nMessage de l'agent: " + messageToClient);
            
            // Option 2: Si vous avez un champ dédié pour le message de l'agent
            // reservation.setAgentMessage(messageToClient);
        }
        
        reservation.setStartDateTime(startDateTime);
        reservation.setEndDateTime(endDateTime);
        reservation.setStatus(Status.CONFIRMED);
        reservation.setUpdatedAt(LocalDateTime.now());
        
        // Mettre à jour les disponibilités
        logger.info("Mise à jour des disponibilités après confirmation de réservation");
        availabilityService.updateAvailabilityAfterReservation(reservation);
        
        Reservation savedReservation = reservationRepository.save(reservation);
        
        // Notifier les clients et les agents de la mise à jour de la réservation
        logger.info("Envoi de notification WebSocket pour la réservation confirmée");
        messagingTemplate.convertAndSend("/topic/reservation-updated", savedReservation);
        
        return savedReservation;
    }
    
    // Surcharge de la méthode existante pour maintenir la compatibilité
    @Transactional
    public Reservation confirmReservation(Long reservationId, LocalDateTime startDateTime, LocalDateTime endDateTime) {
        return confirmReservation(reservationId, startDateTime, endDateTime, null);
    }
    
    // Get reservations by user
    public List<Reservation> getReservationsByUser(Users user) {
        return reservationRepository.findByUser(user);
    }
    
    // Cancel a reservation by agent or user
    @Transactional
    public Reservation cancelReservation(Long reservationId, String cancellationReason) {
        logger.info("Annulation de la réservation: {}", reservationId);
        
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new RuntimeException("Réservation non trouvée"));
        
        // Vérifier que la réservation est en attente ou confirmée
        if (reservation.getStatus() != Status.PENDING && reservation.getStatus() != Status.CONFIRMED) {
            throw new RuntimeException("Cette réservation ne peut pas être annulée");
        }
        
        // Récupérer l'agent qui effectue l'action
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        
        // Vérifier si c'est un agent qui effectue l'action
        if (authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_AGENT"))) {
            Users user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
            
            Agent agent = agentRepository.findByUser(user)
                    .orElseThrow(() -> new RuntimeException("Agent non trouvé"));
            
            // Enregistrer l'agent qui traite cette réservation
            reservation.setHandledByAgent(agent);
            
            // Ajouter la raison d'annulation si présente
            if (cancellationReason != null && !cancellationReason.trim().isEmpty()) {
                // Option 1: Ajouter à la description existante
                reservation.setDescription(reservation.getDescription() + 
                                     "\n\nRaison d'annulation: " + cancellationReason);
                
                // Option 2: Si vous avez un champ dédié pour la raison d'annulation
                // reservation.setCancellationReason(cancellationReason);
            }
        }
        
        reservation.setStatus(Status.CANCELED);
        reservation.setUpdatedAt(LocalDateTime.now());
        
        // Si la réservation avait une date préférée, libérer le créneau
        if (reservation.getPreferredDate() != null && !reservation.getPreferredDate().isEmpty()) {
            try {
                LocalDateTime preferredDateTime = LocalDateTime.parse(reservation.getPreferredDate());
                logger.info("Libération du créneau après annulation: {}", preferredDateTime);
                availabilityService.releaseTimeSlot(reservation.getAgency(), preferredDateTime);
            } catch (DateTimeParseException e) {
                logger.error("Erreur lors du parsing de la date préférée: {}", e.getMessage());
            }
        }
        
        Reservation savedReservation = reservationRepository.save(reservation);
        
        // Notifier les clients et les agents de la mise à jour de la réservation
        logger.info("Envoi de notification WebSocket pour la réservation annulée");
        messagingTemplate.convertAndSend("/topic/reservation-updated", savedReservation);
        
        return savedReservation;
    }
    
    // Surcharge de la méthode existante pour maintenir la compatibilité
    @Transactional
    public Reservation cancelReservation(Long reservationId) {
        return cancelReservation(reservationId, null);
    }
    
    // Complete a reservation (mark as completed)
    @Transactional
    public Reservation completeReservation(Long reservationId, String completionNotes) {
        logger.info("Marquage de la réservation comme terminée: {}", reservationId);
        
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new RuntimeException("Réservation non trouvée"));
        
        // Vérifier que la réservation est confirmée
        if (reservation.getStatus() != Status.CONFIRMED) {
            throw new RuntimeException("Seules les réservations confirmées peuvent être marquées comme terminées");
        }
        
        // Vérifier que le créneau est terminé
        if (reservation.getEndDateTime() != null && reservation.getEndDateTime().isAfter(LocalDateTime.now())) {
            throw new RuntimeException("La réservation ne peut être marquée comme terminée qu'après la fin du créneau prévu");
        }
        
        // Récupérer l'agent qui effectue l'action
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        
        Users user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
        
        Agent agent = agentRepository.findByUser(user)
                .orElseThrow(() -> new RuntimeException("Agent non trouvé"));
        
        // Enregistrer l'agent qui traite cette réservation
        reservation.setHandledByAgent(agent);
        
        // Ajouter des notes de complétion si présentes
        if (completionNotes != null && !completionNotes.trim().isEmpty()) {
            // Option 1: Ajouter à la description existante
            reservation.setDescription(reservation.getDescription() + 
                                 "\n\nNotes de complétion: " + completionNotes);
            
            // Option 2: Si vous avez un champ dédié pour les notes de complétion
            // reservation.setCompletionNotes(completionNotes);
        }
        
        reservation.setStatus(Status.COMPLETED);
        reservation.setUpdatedAt(LocalDateTime.now());
        
        Reservation savedReservation = reservationRepository.save(reservation);
        
        // Notifier les clients et les agents de la mise à jour de la réservation
        logger.info("Envoi de notification WebSocket pour la réservation terminée");
        messagingTemplate.convertAndSend("/topic/reservation-updated", savedReservation);
        
        return savedReservation;
    }
    
    // Surcharge de la méthode existante pour maintenir la compatibilité
    @Transactional
    public Reservation completeReservation(Long reservationId) {
        return completeReservation(reservationId, null);
    }
}