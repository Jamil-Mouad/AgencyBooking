package com.project.agent.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.project.agent.dto.ApiResponse;
import com.project.agent.dto.LockStatusDTO;
import com.project.agent.model.Agent;
import com.project.agent.model.Reservation;
import com.project.agent.repository.ReservationRepository;
import com.project.agent.service.ReservationLockService;

@RestController
@RequestMapping("/api/agent/lock")
@PreAuthorize("hasRole('AGENT')")
public class ReservationLockController {

    @Autowired
    private ReservationLockService lockService;
    
    @Autowired
    private ReservationRepository reservationRepository;
    
    @Autowired
    private SimpMessagingTemplate messagingTemplate;
    
    /**
     * Tente de verrouiller une réservation pour l'agent actuel
     */
    @PostMapping("/acquire/{reservationId}")
    public ResponseEntity<ApiResponse> acquireLock(@PathVariable Long reservationId) {
        try {
            boolean locked = lockService.lockReservation(reservationId);
            
            if (locked) {
                return ResponseEntity.ok(new ApiResponse("Réservation verrouillée avec succès", true));
            } else {
                // Trouver l'agent qui a verrouillé la réservation
                Reservation reservation = reservationRepository.findById(reservationId)
                        .orElseThrow(() -> new RuntimeException("Réservation non trouvée"));
                
                Agent lockingAgent = lockService.getLockingAgent(reservation);
                String message = "Cette réservation est en cours de traitement par un autre agent";

                if (lockingAgent != null) {
                    String email = lockingAgent.getUser() != null ? lockingAgent.getUser().getEmail() : "";
                    message = "Cette réservation est en cours de traitement par " + lockingAgent.getUsername()
                            + (email.isEmpty() ? "" : " (email: " + email + ")");
                }
                
                return ResponseEntity.badRequest().body(new ApiResponse(message, false));
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ApiResponse(e.getMessage(), false));
        }
    }
    
    /**
     * Libère le verrou sur une réservation
     */
    @PostMapping("/release/{reservationId}")
    public ResponseEntity<ApiResponse> releaseLock(@PathVariable Long reservationId) {
        try {
            lockService.releaseReservationLock(reservationId);
            return ResponseEntity.ok(new ApiResponse("Verrou libéré avec succès", true));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ApiResponse(e.getMessage(), false));
        }
    }
    
    /**
     * Prolonge un verrou existant
     */
    @PostMapping("/extend/{reservationId}")
    public ResponseEntity<ApiResponse> extendLock(@PathVariable Long reservationId) {
        try {
            boolean extended = lockService.extendLock(reservationId);
            
            if (extended) {
                return ResponseEntity.ok(new ApiResponse("Verrou prolongé avec succès", true));
            } else {
                return ResponseEntity.badRequest().body(new ApiResponse(
                        "Impossible de prolonger ce verrou", false));
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ApiResponse(e.getMessage(), false));
        }
    }
    
    /**
     * Force la libération d'un verrou (admin seulement)
     */
    @PostMapping("/force-release/{reservationId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse> forceReleaseLock(@PathVariable Long reservationId) {
        try {
            lockService.forceReleaseReservationLock(reservationId);
            return ResponseEntity.ok(new ApiResponse("Verrou forcé à être libéré avec succès", true));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ApiResponse(e.getMessage(), false));
        }
    }
    
    /**
     * Endpoint WebSocket pour vérifier si une réservation est verrouillée
     */
    @MessageMapping("/check-lock/{reservationId}")
    public void checkLock(@DestinationVariable Long reservationId) {
        try {
            Reservation reservation = reservationRepository.findById(reservationId)
                    .orElseThrow(() -> new RuntimeException("Réservation non trouvée"));
            
            boolean isLocked = lockService.isReservationLocked(reservation);
            Agent lockingAgent = lockService.getLockingAgent(reservation);
            
            LockStatusDTO response = new LockStatusDTO();
            response.setReservationId(reservationId);
            response.setLocked(isLocked);
            
            if (isLocked && lockingAgent != null) {
                response.setAgentId(lockingAgent.getId());
                response.setAgentName(lockingAgent.getUsername());
                if (lockingAgent.getUser() != null) {
                    response.setAgentEmail(lockingAgent.getUser().getEmail());
                }
                response.setLockMessage("En cours de traitement par " + lockingAgent.getUsername());
            } else {
                response.setLockMessage("Disponible pour traitement");
            }
            
            // Envoyer la réponse au topic spécifique à cette réservation
            messagingTemplate.convertAndSend("/topic/lock-status/" + reservationId, response);
        } catch (Exception e) {
            LockStatusDTO response = new LockStatusDTO();
            response.setReservationId(reservationId);
            response.setLocked(false);
            response.setLockMessage("Erreur: " + e.getMessage());
            
            messagingTemplate.convertAndSend("/topic/lock-status/" + reservationId, response);
        }
    }
}