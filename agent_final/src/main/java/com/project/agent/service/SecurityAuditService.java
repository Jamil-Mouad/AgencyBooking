package com.project.agent.service;

import java.time.LocalDateTime;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.project.agent.model.SecurityAuditLog;
import com.project.agent.repository.SecurityAuditLogRepository;

@Service
public class SecurityAuditService {
    
    private static final Logger logger = LoggerFactory.getLogger(SecurityAuditService.class);
    
    @Autowired
    private SecurityAuditLogRepository auditLogRepository;
    
    @Autowired
    private ObjectMapper objectMapper;
    
    /**
     * Enregistre une action d'audit
     */
    public void logAction(String action, String resourceType, String resourceId, Map<String, Object> details) {
        try {
            // Récupérer l'utilisateur actuel
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String userEmail = authentication != null ? authentication.getName() : "system";
            
            // Créer l'entrée d'audit
            SecurityAuditLog auditLog = new SecurityAuditLog();
            auditLog.setTimestamp(LocalDateTime.now());
            auditLog.setUserEmail(userEmail);
            auditLog.setAction(action);
            auditLog.setResourceType(resourceType);
            auditLog.setResourceId(resourceId);
            
            // Convertir les détails en JSON
            if (details != null) {
                auditLog.setDetails(objectMapper.writeValueAsString(details));
            }
            
            // Enregistrer dans la base de données
            auditLogRepository.save(auditLog);
            
            // Journaliser également dans les logs applicatifs
            logger.info("AUDIT: {} {} {} by {} {}", 
                    action, resourceType, resourceId, userEmail, 
                    details != null ? details : "");
            
        } catch (Exception e) {
            logger.error("Erreur lors de l'enregistrement de l'audit: {}", e.getMessage(), e);
        }
    }
    
    /**
     * Méthodes de commodité pour les actions courantes
     */
    public void logLoginSuccess(String userEmail) {
        logAction("LOGIN_SUCCESS", "USER", userEmail, null);
    }
    
    public void logLoginFailure(String userEmail, String reason) {
        logAction("LOGIN_FAILURE", "USER", userEmail, Map.of("reason", reason));
    }
    
    public void logLogout(String userEmail) {
        logAction("LOGOUT", "USER", userEmail, null);
    }
    
    public void logReservationCreated(String reservationId, String userEmail) {
        logAction("CREATE", "RESERVATION", reservationId, Map.of("createdBy", userEmail));
    }
    
    public void logReservationConfirmed(String reservationId, String agentEmail) {
        logAction("CONFIRM", "RESERVATION", reservationId, Map.of("confirmedBy", agentEmail));
    }
    
    public void logReservationCanceled(String reservationId, String byEmail, String reason) {
        logAction("CANCEL", "RESERVATION", reservationId, 
                Map.of("canceledBy", byEmail, "reason", reason != null ? reason : "none provided"));
    }
    
    public void logReservationCompleted(String reservationId, String agentEmail) {
        logAction("COMPLETE", "RESERVATION", reservationId, Map.of("completedBy", agentEmail));
    }
    
    public void logAccessDenied(String userEmail, String resource, String action) {
        logAction("ACCESS_DENIED", resource, action, Map.of("user", userEmail));
    }
}