package com.project.agent.controller;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.project.agent.dto.ApiResponse;
import com.project.agent.dto.TimeSlotManagementDTO;
import com.project.agent.model.BlockedTimeSlot;
import com.project.agent.repository.AgencyRepository;
import com.project.agent.repository.BlockedTimeSlotRepository;
import com.project.agent.service.AvailabilityService;

@RestController
@RequestMapping("/api/timeslots")
public class TimeSlotManagementController {
    
    private static final Logger logger = LoggerFactory.getLogger(TimeSlotManagementController.class);
    
    @Autowired
    private AvailabilityService availabilityService;
    
    @Autowired
    private SimpMessagingTemplate messagingTemplate;
    
    @Autowired
    private BlockedTimeSlotRepository blockedTimeSlotRepository;
    
    @Autowired
    private AgencyRepository agencyRepository;
    
    /**
     * Bloque un créneau horaire (agents et admins seulement)
     * Accepts JSON body with agencyId, date, time, reason
     */
    @PostMapping("/block")
    @PreAuthorize("hasAnyRole('AGENT', 'ADMIN')")
    public ResponseEntity<ApiResponse> blockTimeSlot(@RequestBody TimeSlotManagementDTO request) {
        
        logger.info("Requête de blocage de créneau pour l'agence {}: {} à {}", 
                request.getAgencyId(), request.getDate(), request.getTime());
        
        try {
            LocalDate localDate = request.getDate();
            LocalTime localTime = request.getTime();
            
            availabilityService.blockTimeSlot(request.getAgencyId(), localDate, localTime, request.getReason());
            
            return ResponseEntity.ok(new ApiResponse(
                "Créneau horaire bloqué avec succès", true));
        } catch (Exception e) {
            logger.error("Erreur lors du blocage du créneau: {}", e.getMessage());
            return ResponseEntity.badRequest().body(new ApiResponse(
                e.getMessage(), false));
        }
    }
    
    /**
     * Débloque un créneau horaire par son ID (agents et admins seulement)
     */
    @PostMapping("/unblock/{id}")
    @PreAuthorize("hasAnyRole('AGENT', 'ADMIN')")
    public ResponseEntity<ApiResponse> unblockTimeSlotById(@PathVariable Long id) {
        
        logger.info("Requête de déblocage de créneau par ID: {}", id);
        
        try {
            BlockedTimeSlot blockedSlot = blockedTimeSlotRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Créneau bloqué non trouvé"));
            
            Long agencyId = blockedSlot.getAgency().getId();
            LocalDate date = blockedSlot.getDate();
            LocalTime time = blockedSlot.getTime();
            
            availabilityService.unblockTimeSlot(agencyId, date, time);
            
            return ResponseEntity.ok(new ApiResponse(
                "Créneau horaire débloqué avec succès", true));
        } catch (Exception e) {
            logger.error("Erreur lors du déblocage du créneau: {}", e.getMessage());
            return ResponseEntity.badRequest().body(new ApiResponse(
                e.getMessage(), false));
        }
    }
    
    /**
     * Débloque un créneau horaire par paramètres (agents et admins seulement)
     */
    @PostMapping("/unblock")
    @PreAuthorize("hasAnyRole('AGENT', 'ADMIN')")
    public ResponseEntity<ApiResponse> unblockTimeSlot(
            @RequestParam Long agencyId, 
            @RequestParam String date, 
            @RequestParam String time) {
        
        logger.info("Requête de déblocage de créneau pour l'agence {}: {} à {}", agencyId, date, time);
        
        try {
            LocalDate localDate = LocalDate.parse(date);
            LocalTime localTime = LocalTime.parse(time);
            
            availabilityService.unblockTimeSlot(agencyId, localDate, localTime);
            
            return ResponseEntity.ok(new ApiResponse(
                "Créneau horaire débloqué avec succès", true));
        } catch (DateTimeParseException e) {
            logger.error("Format de date/heure invalide: {}", e.getMessage());
            return ResponseEntity.badRequest().body(new ApiResponse(
                "Format de date ou d'heure invalide", false));
        } catch (Exception e) {
            logger.error("Erreur lors du déblocage du créneau: {}", e.getMessage());
            return ResponseEntity.badRequest().body(new ApiResponse(
                e.getMessage(), false));
        }
    }
    
    /**
     * Récupère tous les créneaux bloqués d'une agence
     */
    @GetMapping("/agency/{agencyId}")
    @PreAuthorize("hasAnyRole('AGENT', 'ADMIN')")
    public ResponseEntity<List<BlockedTimeSlot>> getBlockedSlotsByAgency(@PathVariable Long agencyId) {
        
        logger.info("Requête de récupération des créneaux bloqués pour l'agence {}", agencyId);
        
        try {
            var agency = agencyRepository.findById(agencyId)
                    .orElseThrow(() -> new RuntimeException("Agence non trouvée"));
            
            // Get blocked slots for current date onwards (not past ones)
            LocalDate today = LocalDate.now();
            LocalDate endDate = today.plusMonths(3); // Show up to 3 months ahead
            
            List<BlockedTimeSlot> blockedSlots = blockedTimeSlotRepository
                    .findByAgencyAndDateBetween(agency, today, endDate);
            
            return ResponseEntity.ok(blockedSlots);
        } catch (Exception e) {
            logger.error("Erreur lors de la récupération des créneaux bloqués: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
    
    /**
     * Récupération des détails d'un créneau horaire
     */
    @GetMapping("/details")
    @PreAuthorize("hasAnyRole('AGENT', 'ADMIN')")
    public ResponseEntity<?> getTimeSlotDetails(
            @RequestParam Long agencyId, 
            @RequestParam String date, 
            @RequestParam String time) {
        
        logger.info("Requête de détails de créneau pour l'agence {}: {} à {}", agencyId, date, time);
        
        try {
            LocalDate localDate = LocalDate.parse(date);
            LocalTime localTime = LocalTime.parse(time);
            
            // Vérifier si le créneau est disponible
            boolean isAvailable = availabilityService.isTimeSlotAvailable(agencyId, localDate, localTime);
            
            TimeSlotManagementDTO response = new TimeSlotManagementDTO();
            response.setAgencyId(agencyId);
            response.setDate(localDate);
            response.setTime(localTime);
            response.setBlocked(!isAvailable);
            
            return ResponseEntity.ok(response);
        } catch (DateTimeParseException e) {
            logger.error("Format de date/heure invalide: {}", e.getMessage());
            return ResponseEntity.badRequest().body(new ApiResponse(
                "Format de date ou d'heure invalide", false));
        } catch (Exception e) {
            logger.error("Erreur lors de la récupération des détails du créneau: {}", e.getMessage());
            return ResponseEntity.badRequest().body(new ApiResponse(
                e.getMessage(), false));
        }
    }
    
    /**
     * Endpoint WebSocket pour bloquer un créneau
     */
    @MessageMapping("/block-timeslot")
    public void blockTimeSlotWs(TimeSlotManagementDTO request) {
        try {
            availabilityService.blockTimeSlot(
                request.getAgencyId(), 
                request.getDate(), 
                request.getTime(), 
                request.getReason());
                
            // La notification est déjà envoyée par le service
        } catch (Exception e) {
            logger.error("Erreur WebSocket lors du blocage du créneau: {}", e.getMessage());
            
            // Envoyer une notification d'erreur
            TimeSlotManagementDTO errorResponse = new TimeSlotManagementDTO();
            errorResponse.setAgencyId(request.getAgencyId());
            errorResponse.setDate(request.getDate());
            errorResponse.setTime(request.getTime());
            errorResponse.setBlocked(false);
            errorResponse.setReason("Erreur: " + e.getMessage());
            
            messagingTemplate.convertAndSend("/topic/timeslot-management-error", errorResponse);
        }
    }
    
    /**
     * Endpoint WebSocket pour débloquer un créneau
     */
    @MessageMapping("/unblock-timeslot")
    public void unblockTimeSlotWs(TimeSlotManagementDTO request) {
        try {
            availabilityService.unblockTimeSlot(
                request.getAgencyId(), 
                request.getDate(), 
                request.getTime());
                
            // La notification est déjà envoyée par le service
        } catch (Exception e) {
            logger.error("Erreur WebSocket lors du déblocage du créneau: {}", e.getMessage());
            
            // Envoyer une notification d'erreur
            TimeSlotManagementDTO errorResponse = new TimeSlotManagementDTO();
            errorResponse.setAgencyId(request.getAgencyId());
            errorResponse.setDate(request.getDate());
            errorResponse.setTime(request.getTime());
            errorResponse.setBlocked(true);
            errorResponse.setReason("Erreur: " + e.getMessage());
            
            messagingTemplate.convertAndSend("/topic/timeslot-management-error", errorResponse);
        }
    }
}
