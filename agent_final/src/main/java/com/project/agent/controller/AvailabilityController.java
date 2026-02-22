package com.project.agent.controller;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.project.agent.dto.ApiResponse;
import com.project.agent.dto.AvailabilityDTO;
import com.project.agent.dto.TimeSlotCheckDTO;
import com.project.agent.model.Agency;
import com.project.agent.model.Availability;
import com.project.agent.repository.AgencyRepository;
import com.project.agent.service.AvailabilityService;

@RestController
@RequestMapping("/api/availability")
public class AvailabilityController {
    private static final Logger logger = LoggerFactory.getLogger(AvailabilityController.class);

    @Autowired
    private AvailabilityService availabilityService;
    
    @Autowired
    private AgencyRepository agencyRepository;
    
    @Autowired
    private SimpMessagingTemplate messagingTemplate;
    
    /**
     * Récupère les disponibilités d'une agence pour une date donnée
     */
    @GetMapping("/{agencyId}")
    public ResponseEntity<AvailabilityDTO> getAgencyAvailability(
            @PathVariable Long agencyId,
            @RequestParam String date) {
        
        logger.info("Requête de disponibilité pour l'agence {} à la date {}", agencyId, date);
        
        try {
            // Convertir la chaîne de date en LocalDate
            LocalDate requestedDate = LocalDate.parse(date, DateTimeFormatter.ISO_DATE);
            
            // Utiliser la méthode pour obtenir les données les plus récentes
            Availability availability = availabilityService.refreshAvailability(agencyId, requestedDate);
            
            // Convertir en DTO avec des informations supplémentaires
            AvailabilityDTO availabilityDTO = new AvailabilityDTO(availability);
            
            // Enrichir le DTO avec des informations sur les créneaux réservés
            availabilityService.enrichAvailabilityDTO(availabilityDTO);
            
            return ResponseEntity.ok(availabilityDTO);
        } catch (DateTimeParseException e) {
            logger.error("Format de date invalide: {}", date, e);
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            logger.error("Erreur lors de la récupération des disponibilités: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * Récupère les disponibilités d'une agence pour une semaine
     */
    @GetMapping("/{agencyId}/week")
    public ResponseEntity<List<AvailabilityDTO>> getAgencyAvailabilityForWeek(
            @PathVariable Long agencyId,
            @RequestParam String startDate) {
        
        logger.info("Requête de disponibilité pour la semaine du {} pour l'agence {}", startDate, agencyId);
        
        try {
            // Convertir la chaîne de date en LocalDate
            LocalDate requestedStartDate = LocalDate.parse(startDate, DateTimeFormatter.ISO_DATE);
            
            // Obtenir les disponibilités pour la semaine
            List<Availability> weekAvailability = availabilityService.getAgencyAvailabilityForWeek(agencyId, requestedStartDate);
            
            // Convertir les disponibilités en DTOs
            List<AvailabilityDTO> response = weekAvailability.stream()
                .map(availability -> {
                    AvailabilityDTO dto = new AvailabilityDTO(availability);
                    availabilityService.enrichAvailabilityDTO(dto);
                    return dto;
                })
                .collect(Collectors.toList());
            
            return ResponseEntity.ok(response);
        } catch (DateTimeParseException e) {
            logger.error("Format de date invalide: {}", startDate, e);
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            logger.error("Erreur lors de la récupération des disponibilités: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * Vérifie si un créneau horaire spécifique est disponible
     */
    @GetMapping("/{agencyId}/check")
    public ResponseEntity<TimeSlotCheckDTO> checkTimeSlotAvailability(
            @PathVariable Long agencyId,
            @RequestParam String date,
            @RequestParam String time) {
        
        logger.info("Vérification de disponibilité pour l'agence {} à la date {} à {}h", agencyId, date, time);
        
        try {
            LocalDate requestedDate = LocalDate.parse(date, DateTimeFormatter.ISO_DATE);
            LocalTime requestedTime = LocalTime.parse(time, DateTimeFormatter.ISO_TIME);
            
            boolean isAvailable = availabilityService.isTimeSlotAvailable(agencyId, requestedDate, requestedTime);
            
            TimeSlotCheckDTO response = new TimeSlotCheckDTO();
            response.setAgencyId(agencyId);
            response.setDate(requestedDate);
            response.setTime(requestedTime);
            response.setAvailable(isAvailable);
            
            if (!isAvailable) {
                response.setMessage("Ce créneau n'est pas disponible");
            }
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Erreur lors de la vérification de disponibilité: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().build();
        }
    }
    
    /**
     * Marque un créneau comme temporairement réservé (pour les agents seulement)
     */
    @PostMapping("/{agencyId}/reserve-temp")
    @PreAuthorize("hasRole('AGENT')")
    public ResponseEntity<ApiResponse> reserveTimeSlotTemporarily(
            @PathVariable Long agencyId,
            @RequestParam String date,
            @RequestParam String time,
            @RequestParam(required = false) Long reservationId) {
        
        logger.info("Réservation temporaire d'un créneau pour l'agence {} à la date {} à {}h", agencyId, date, time);
        
        try {
            LocalDate requestedDate = LocalDate.parse(date, DateTimeFormatter.ISO_DATE);
            LocalTime requestedTime = LocalTime.parse(time, DateTimeFormatter.ISO_TIME);
            
            Agency agency = agencyRepository.findById(agencyId)
                    .orElseThrow(() -> new RuntimeException("Agence non trouvée"));
            
            // Marquer le créneau comme temporairement réservé
            availabilityService.markTimeSlotAsTemporarilyBooked(
                    agency, 
                    requestedDate.atTime(requestedTime));
            
            return ResponseEntity.ok(new ApiResponse("Créneau temporairement réservé", true));
        } catch (Exception e) {
            logger.error("Erreur lors de la réservation temporaire: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(new ApiResponse(e.getMessage(), false));
        }
    }
    
    /**
     * Libère un créneau temporairement réservé (pour les agents seulement)
     */
    @PostMapping("/{agencyId}/release-temp")
    @PreAuthorize("hasRole('AGENT')")
    public ResponseEntity<ApiResponse> releaseTimeSlot(
            @PathVariable Long agencyId,
            @RequestParam String date,
            @RequestParam String time) {
        
        logger.info("Libération d'un créneau pour l'agence {} à la date {} à {}h", agencyId, date, time);
        
        try {
            LocalDate requestedDate = LocalDate.parse(date, DateTimeFormatter.ISO_DATE);
            LocalTime requestedTime = LocalTime.parse(time, DateTimeFormatter.ISO_TIME);
            
            Agency agency = agencyRepository.findById(agencyId)
                    .orElseThrow(() -> new RuntimeException("Agence non trouvée"));
            
            // Libérer le créneau
            availabilityService.releaseTimeSlot(
                    agency, 
                    requestedDate.atTime(requestedTime));
            
            return ResponseEntity.ok(new ApiResponse("Créneau libéré avec succès", true));
        } catch (Exception e) {
            logger.error("Erreur lors de la libération du créneau: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(new ApiResponse(e.getMessage(), false));
        }
    }
    
    /**
     * Endpoint WebSocket pour récupérer les disponibilités
     */
    @MessageMapping("/fetch-availability/{agencyId}")
    public void fetchAvailability(@DestinationVariable Long agencyId, String dateStr) {
        logger.info("Message WebSocket pour récupérer les disponibilités: agence {}, date {}", agencyId, dateStr);
        
        try {
            LocalDate date = LocalDate.parse(dateStr, DateTimeFormatter.ISO_DATE);
            
            // Utiliser la méthode refresh pour obtenir les données les plus récentes
            Availability availability = availabilityService.refreshAvailability(agencyId, date);
            
            // Convertir en DTO
            AvailabilityDTO availabilityDTO = new AvailabilityDTO(availability);
            availabilityService.enrichAvailabilityDTO(availabilityDTO);
            
            logger.info("Envoi des disponibilités via WebSocket pour l'agence {} à la date {}", agencyId, date);
            messagingTemplate.convertAndSend("/topic/availability/" + agencyId, availabilityDTO);
        } catch (Exception e) {
            logger.error("Erreur lors du traitement WebSocket: {}", e.getMessage(), e);
            Map<String, String> errorResponse = Map.of("error", e.getMessage());
            messagingTemplate.convertAndSend("/topic/availability/" + agencyId + "/error", errorResponse);
        }
    }
}