package com.project.agent.controller;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.Authentication;

import com.project.agent.dto.AgentInfoDTO;
import com.project.agent.dto.AgentStatsDTO;
import com.project.agent.dto.ApiResponse;
import com.project.agent.dto.ReservationCompletionRequest;
import com.project.agent.dto.ReservationConfirmationRequest;
import com.project.agent.dto.ReservationCancellationRequest;
import com.project.agent.model.Agent;
import com.project.agent.model.Reservation;
import com.project.agent.model.Reservation.Status;
import com.project.agent.repository.AgentRepository;
import com.project.agent.repository.ReservationRepository;
import com.project.agent.service.AgentStatsService;
import com.project.agent.service.ReservationService;
import com.project.agent.service.ReservationLockService;
import com.project.agent.service.EmailService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/agent")
public class AgentController {

    @Autowired
    private ReservationService reservationService;
    
    @Autowired
    private EmailService emailService;
    
    @Autowired
    private SimpMessagingTemplate messagingTemplate;
    
    @Autowired
    private AgentRepository agentRepository;
    
    @Autowired
    private ReservationRepository reservationRepository;
    
    @Autowired
    private AgentStatsService agentStatsService;
    
    @Autowired
    private ReservationLockService lockService;
    
    @GetMapping("/reservations/pending")
    @PreAuthorize("hasRole('AGENT')")
    public ResponseEntity<List<Reservation>> getPendingReservations() {
        // Get the current agent
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        
        try {
            // Try to find agent with this email
            Agent agent = agentRepository.findByUser_Email(email)
                    .orElseThrow(() -> new RuntimeException("Agent not found"));
            
            // If agent is associated with an agency, get only that agency's reservations
            if (agent.getAgency() != null) {
                List<Reservation> pendingReservations = reservationRepository.findByAgencyAndStatus(
                    agent.getAgency(), Status.PENDING);
                return ResponseEntity.ok(pendingReservations);
            }
        } catch (Exception e) {
            // If not found as Agent or any other error, fall back to standard behavior
            // This handles the case where the user is an AGENT role but not in the Agent table
        }
        
        // Default behavior - get all pending reservations
        List<Reservation> pendingReservations = reservationService.getPendingReservations();
        return ResponseEntity.ok(pendingReservations);
    }
    
    @GetMapping("/reservations/confirmed")
    @PreAuthorize("hasRole('AGENT')")
    public ResponseEntity<List<Reservation>> getConfirmedReservations() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        
        try {
            Agent agent = agentRepository.findByUser_Email(email)
                    .orElseThrow(() -> new RuntimeException("Agent not found"));
            
            if (agent.getAgency() != null) {
                List<Reservation> confirmedReservations = reservationRepository.findByAgencyAndStatus(
                    agent.getAgency(), Status.CONFIRMED);
                return ResponseEntity.ok(confirmedReservations);
            }
        } catch (Exception e) {
            // Fall back to standard behavior
        }
        
        List<Reservation> confirmedReservations = reservationRepository.findByStatus(Status.CONFIRMED);
        return ResponseEntity.ok(confirmedReservations);
    }
    
    @GetMapping("/reservations/completed")
    @PreAuthorize("hasRole('AGENT')")
    public ResponseEntity<List<Reservation>> getCompletedReservations() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        
        try {
            Agent agent = agentRepository.findByUser_Email(email)
                    .orElseThrow(() -> new RuntimeException("Agent not found"));
            
            if (agent.getAgency() != null) {
                List<Reservation> completedReservations = reservationRepository.findByAgencyAndStatus(
                    agent.getAgency(), Status.COMPLETED);
                return ResponseEntity.ok(completedReservations);
            }
        } catch (Exception e) {
            // Fall back to standard behavior
        }
        
        List<Reservation> completedReservations = reservationRepository.findByStatus(Status.COMPLETED);
        return ResponseEntity.ok(completedReservations);
    }
    
    @GetMapping("/reservations/canceled")
    @PreAuthorize("hasRole('AGENT')")
    public ResponseEntity<List<Reservation>> getCanceledReservations() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        
        try {
            Agent agent = agentRepository.findByUser_Email(email)
                    .orElseThrow(() -> new RuntimeException("Agent not found"));
            
            if (agent.getAgency() != null) {
                List<Reservation> canceledReservations = reservationRepository.findByAgencyAndStatus(
                    agent.getAgency(), Status.CANCELED);
                return ResponseEntity.ok(canceledReservations);
            }
        } catch (Exception e) {
            // Fall back to standard behavior
        }
        
        List<Reservation> canceledReservations = reservationRepository.findByStatus(Status.CANCELED);
        return ResponseEntity.ok(canceledReservations);
    }
    
    /**
     * Récupère les informations de l'agent connecté
     */
    @GetMapping("/info")
    @PreAuthorize("hasRole('AGENT')")
    public ResponseEntity<AgentInfoDTO> getAgentInfo() {
        AgentInfoDTO agentInfo = agentStatsService.getCurrentAgentInfo();
        return ResponseEntity.ok(agentInfo);
    }
    
    /**
     * Permet à l'agent de basculer sa disponibilité
     */
    @PutMapping("/toggle-availability")
    @PreAuthorize("hasRole('AGENT')")
    public ResponseEntity<AgentInfoDTO> toggleAvailability() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        
        Agent agent = agentRepository.findAll().stream()
                .filter(a -> a.getUser().getEmail().equals(email))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Agent non trouvé"));
        
        agent.setAvailable(!agent.isAvailable());
        agentRepository.save(agent);
        
        AgentInfoDTO agentInfo = agentStatsService.getCurrentAgentInfo();
        return ResponseEntity.ok(agentInfo);
    }
    
    /**
     * Récupère les statistiques de l'agent connecté
     */
    @GetMapping("/stats")
    @PreAuthorize("hasRole('AGENT')")
    public ResponseEntity<AgentStatsDTO> getAgentStats() {
        AgentStatsDTO stats = agentStatsService.getAgentStats();
        return ResponseEntity.ok(stats);
    }
    
    // Endpoint WebSocket pour demander les réservations en attente
    @MessageMapping("/fetch-reservations")
    public void fetchReservationsWs() {
        List<Reservation> pendingReservations = reservationService.getPendingReservations();
        messagingTemplate.convertAndSend("/topic/reservations", pendingReservations);
    }
    
    @PostMapping("/reservation/confirm/{id}")
    @PreAuthorize("hasRole('AGENT')")
    public ResponseEntity<ApiResponse> confirmReservation(
            @PathVariable("id") Long reservationId,
            @Valid @RequestBody ReservationConfirmationRequest confirmationRequest) {
        
        try {
            // Vérifier si la réservation est verrouillée par un autre agent
            Reservation reservation = reservationRepository.findById(reservationId)
                    .orElseThrow(() -> new RuntimeException("Réservation non trouvée"));
            
            if (lockService.isReservationLocked(reservation)) {
                Agent lockingAgent = lockService.getLockingAgent(reservation);
                String message = "Cette réservation est en cours de traitement par un autre agent";
                
                if (lockingAgent != null) {
                    message += " (" + lockingAgent.getUsername() + ")";
                }
                
                return ResponseEntity.badRequest().body(new ApiResponse(message, false));
            }
            
            // Essayer de verrouiller la réservation
            boolean locked = lockService.lockReservation(reservationId);
            if (!locked) {
                return ResponseEntity.badRequest().body(new ApiResponse(
                        "Impossible de verrouiller la réservation pour la traiter", false));
            }
            
            try {
                // Traiter la réservation
                Reservation confirmedReservation = reservationService.confirmReservation(
                        reservationId, 
                        confirmationRequest.getStartDateTime(), 
                        confirmationRequest.getEndDateTime(), 
                        confirmationRequest.getMessage());
                
                // Envoyer l'email de confirmation
                emailService.sendReservationConfirmation(confirmedReservation, confirmationRequest.getMessage());
                messagingTemplate.convertAndSend("/topic/reservation-updated", confirmedReservation);
                
                // Libérer le verrou après traitement
                lockService.releaseReservationLock(reservationId);
                
                return ResponseEntity.ok(new ApiResponse("Réservation confirmée avec succès" , true));
            } catch (Exception e) {
                // En cas d'erreur, s'assurer que le verrou est libéré
                lockService.releaseReservationLock(reservationId);
                throw e;
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ApiResponse(e.getMessage(), false));
        }
    }
    
    @PostMapping("/reservation/cancel/{id}")
    @PreAuthorize("hasRole('AGENT')")
    public ResponseEntity<ApiResponse> cancelReservation(
            @PathVariable("id") Long reservationId,
            @Valid @RequestBody(required = false) ReservationCancellationRequest cancellationRequest) {
        
        try {
            // Vérifier si la réservation est verrouillée par un autre agent
            Reservation reservation = reservationRepository.findById(reservationId)
                    .orElseThrow(() -> new RuntimeException("Réservation non trouvée"));
            
            if (lockService.isReservationLocked(reservation)) {
                Agent lockingAgent = lockService.getLockingAgent(reservation);
                String message = "Cette réservation est en cours de traitement par un autre agent";
                
                if (lockingAgent != null) {
                    message += " (" + lockingAgent.getUsername() + ")";
                }
                
                return ResponseEntity.badRequest().body(new ApiResponse(message, false));
            }
            
            // Essayer de verrouiller la réservation
            boolean locked = lockService.lockReservation(reservationId);
            if (!locked) {
                return ResponseEntity.badRequest().body(new ApiResponse(
                        "Impossible de verrouiller la réservation pour la traiter", false));
            }
            
            try {
                // Traiter l'annulation
                String reason = (cancellationRequest != null) ? cancellationRequest.getReason() : null;
                Reservation canceledReservation = reservationService.cancelReservation(reservationId, reason);
                
                // Notification de l'annulation par email
                emailService.sendReservationCancellation(canceledReservation, reason);
                
                // Notifier en temps réel de la mise à jour
                messagingTemplate.convertAndSend("/topic/reservation-updated", canceledReservation);
                
                // Libérer le verrou après traitement
                lockService.releaseReservationLock(reservationId);
                
                return ResponseEntity.ok(new ApiResponse("Réservation annulée avec succès", true));
            } catch (Exception e) {
                // En cas d'erreur, s'assurer que le verrou est libéré
                lockService.releaseReservationLock(reservationId);
                throw e;
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ApiResponse(e.getMessage(), false));
        }
    }
    
    /**
     * Marquer une réservation comme terminée
     */
    @PostMapping("/reservation/complete/{id}")
    @PreAuthorize("hasRole('AGENT')")
    public ResponseEntity<ApiResponse> completeReservation(
            @PathVariable("id") Long reservationId,
            @Valid @RequestBody(required = false) ReservationCompletionRequest completionRequest) {
        
        try {
            // Vérifier si la réservation est verrouillée par un autre agent
            Reservation reservation = reservationRepository.findById(reservationId)
                    .orElseThrow(() -> new RuntimeException("Réservation non trouvée"));
            
            if (lockService.isReservationLocked(reservation)) {
                Agent lockingAgent = lockService.getLockingAgent(reservation);
                String message = "Cette réservation est en cours de traitement par un autre agent";
                
                if (lockingAgent != null) {
                    message += " (" + lockingAgent.getUsername() + ")";
                }
                
                return ResponseEntity.badRequest().body(new ApiResponse(message, false));
            }
            
            // Essayer de verrouiller la réservation
            boolean locked = lockService.lockReservation(reservationId);
            if (!locked) {
                return ResponseEntity.badRequest().body(new ApiResponse(
                        "Impossible de verrouiller la réservation pour la traiter", false));
            }
            
            try {
                // Traiter la complétion
                String notes = (completionRequest != null) ? completionRequest.getNotes() : null;
                Reservation completedReservation = reservationService.completeReservation(reservationId, notes);
                
                // Notification de la complétion par email
                emailService.sendReservationCompletion(completedReservation, notes);
                
                // Notifier en temps réel de la mise à jour
                messagingTemplate.convertAndSend("/topic/reservation-updated", completedReservation);
                
                // Libérer le verrou après traitement
                lockService.releaseReservationLock(reservationId);
                
                return ResponseEntity.ok(new ApiResponse("Réservation marquée comme terminée avec succès", true));
            } catch (Exception e) {
                // En cas d'erreur, s'assurer que le verrou est libéré
                lockService.releaseReservationLock(reservationId);
                throw e;
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ApiResponse(e.getMessage(), false));
        }
    }
}