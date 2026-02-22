package com.project.agent.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import com.project.agent.model.Agent;
import com.project.agent.model.Agency;
import com.project.agent.model.Reservation;
import com.project.agent.model.Users;
import com.project.agent.repository.AgentRepository;
import com.project.agent.repository.ReservationRepository;
import com.project.agent.repository.UserRepository;

@Service
public class AuthorizationService {
    
    private static final Logger logger = LoggerFactory.getLogger(AuthorizationService.class);
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private AgentRepository agentRepository;
    
    @Autowired
    private ReservationRepository reservationRepository;
    
    @Autowired
    private SecurityAuditService auditService;
    
    /**
     * Vérifie si l'utilisateur actuel est autorisé à accéder à une réservation
     */
    public boolean canAccessReservation(Long reservationId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userEmail = authentication.getName();
        
        // Les administrateurs ont accès à tout
        if (authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
            return true;
        }
        
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElse(null);
        
        if (reservation == null) {
            logger.warn("Tentative d'accès à une réservation inexistante: {}", reservationId);
            return false;
        }
        
        // Si c'est l'utilisateur propriétaire de la réservation
        if (reservation.getUser() != null && 
            reservation.getUser().getEmail().equals(userEmail)) {
            return true;
        }
        
        // Si c'est un agent - MODIFIÉ: les agents ont accès à toutes les réservations de toutes les agences
        if (authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_AGENT"))) {
            
            // Pour débugger et voir quel agent tente d'accéder
            logger.debug("Agent {} tente d'accéder à la réservation {}", userEmail, reservationId);
            
            // Par défaut, autoriser l'accès aux agents
            return true;
            
            /* Version plus restrictive si nécessaire dans le futur
            Users user = userRepository.findByEmail(userEmail)
                    .orElse(null);
            
            if (user != null) {
                Agent agent = agentRepository.findByUser(user)
                        .orElse(null);
                
                if (agent != null) {
                    // Vérifier si l'agent appartient à la même agence que la réservation
                    Agency agentAgency = agent.getAgency();
                    Agency reservationAgency = reservation.getAgency();
                    
                    if (agentAgency != null && reservationAgency != null && 
                        agentAgency.getId().equals(reservationAgency.getId())) {
                        return true;
                    } else {
                        logger.warn("Agent {} (agence {}) a tenté d'accéder à une réservation de l'agence {}", 
                                userEmail, 
                                agentAgency != null ? agentAgency.getId() : "none", 
                                reservationAgency != null ? reservationAgency.getId() : "none");
                        auditService.logAccessDenied(userEmail, "RESERVATION", "ACCESS");
                    }
                }
            }
            */
        }
        
        return false;
    }
    
    /**
     * Vérifie si l'utilisateur actuel est autorisé à accéder à une agence
     */
    public boolean canAccessAgency(Long agencyId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userEmail = authentication.getName();
        
        // Les administrateurs ont accès à tout
        if (authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
            return true;
        }
        
        // Les agents ont accès à toutes les agences
        if (authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_AGENT"))) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Vérifie si l'utilisateur actuel est autorisé à modifier une réservation
     */
    public boolean canModifyReservation(Long reservationId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        // Les administrateurs peuvent tout modifier
        if (authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
            return true;
        }
        
        // Tous les agents peuvent modifier les réservations
        if (authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_AGENT"))) {
            return true;
        }
        
        // Les utilisateurs peuvent modifier leurs propres réservations en attente
        if (authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_USER"))) {
            
            String userEmail = authentication.getName();
            
            Reservation reservation = reservationRepository.findById(reservationId)
                    .orElse(null);
            
            if (reservation == null) {
                return false;
            }
            
            if (reservation.getUser() != null && 
                reservation.getUser().getEmail().equals(userEmail) &&
                reservation.getStatus() == Reservation.Status.PENDING) {
                return true;
            }
        }
        
        return false;
    }
}