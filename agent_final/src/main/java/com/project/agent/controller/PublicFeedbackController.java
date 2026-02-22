package com.project.agent.controller;

import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.project.agent.model.ReservationFeedback;
import com.project.agent.service.ReservationFeedbackService;

@RestController
@RequestMapping("/api/public/feedback")
public class PublicFeedbackController {
    
    private static final Logger logger = LoggerFactory.getLogger(PublicFeedbackController.class);
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("d MMMM yyyy");
    
    @Autowired
    private ReservationFeedbackService feedbackService;
    
    /**
     * Récupère les statistiques de feedback pour affichage public
     */
    @GetMapping("/statistics")
    public ResponseEntity<Map<String, Object>> getFeedbackStatistics() {
        logger.info("Récupération des statistiques de feedback pour la page d'index");
        return ResponseEntity.ok(feedbackService.getFeedbackStatistics());
    }
    
    /**
     * Récupère les commentaires récents pour affichage public
     */
    @GetMapping("/comments")
    public ResponseEntity<Map<String, Object>> getRecentComments(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "3") int size) {
        
        logger.info("Récupération des commentaires récents pour la page d'index: page={}, size={}", page, size);
        
        Page<ReservationFeedback> feedbackPage = feedbackService.getRecentFeedback(page, size);
        
        // Convertir en objets simplifiés pour l'affichage public
        List<Map<String, Object>> content = feedbackPage.getContent().stream()
                .filter(feedback -> feedback.getReservation() != null
                        && feedback.getReservation().getUser() != null
                        && feedback.getCreatedAt() != null
                        && feedback.getComment() != null
                        && !feedback.getComment().isEmpty())
                .map(feedback -> {
                    Map<String, Object> item = new HashMap<>();
                    item.put("id", feedback.getId());
                    item.put("rating", feedback.getRating());
                    item.put("comment", feedback.getComment());
                    
                    // Formater la date pour l'affichage
                    String formattedDate = feedback.getCreatedAt().format(DATE_FORMATTER);
                    item.put("date", formattedDate);
                    
                    // Ajouter des informations anonymisées sur l'utilisateur
                    String username = feedback.getReservation().getUser().getDisplayName();
                    item.put("authorName", username);
                    
                    // Ajouter le service concerné
                    String serviceName = feedback.getReservation().getService();
                    item.put("service", serviceName);
                    
                    return item;
                })
                .collect(Collectors.toList());
        
        Map<String, Object> response = new HashMap<>();
        response.put("content", content);
        response.put("currentPage", feedbackPage.getNumber());
        response.put("totalItems", feedbackPage.getTotalElements());
        response.put("totalPages", feedbackPage.getTotalPages());
        
        return ResponseEntity.ok(response);
    }
    
    /**
     * Récupère les témoignages pour affichage public
     */
    @GetMapping("/testimonials")
    public ResponseEntity<Map<String, Object>> getTestimonials(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "3") int size) {
        
        logger.info("Récupération des témoignages pour la page d'index: page={}, size={}", page, size);
        
        Page<ReservationFeedback> feedbackPage = feedbackService.getTestimonials(page, size);
        
        // Convertir en objets simplifiés pour l'affichage public
        List<Map<String, Object>> content = feedbackPage.getContent().stream()
                .filter(feedback -> feedback.getReservation() != null
                        && feedback.getReservation().getUser() != null
                        && feedback.getCreatedAt() != null
                        && feedback.getComment() != null
                        && !feedback.getComment().isEmpty())
                .map(feedback -> {
                    Map<String, Object> item = new HashMap<>();
                    item.put("id", feedback.getId());
                    item.put("rating", feedback.getRating());
                    item.put("comment", feedback.getComment());
                    
                    // Ajouter des informations sur l'utilisateur
                    String username = feedback.getReservation().getUser().getDisplayName();
                    item.put("authorName", username);
                    
                    // Ajouter la date de création
                    item.put("createdAt", feedback.getCreatedAt().format(DATE_FORMATTER));
                    
                    // Ajouter le service concerné
                    item.put("service", feedback.getReservation().getService());
                    
                    // Ajouter une information "client depuis" basée sur la date de la réservation
                    int year = feedback.getReservation().getCreatedAt().getYear();
                    item.put("role", "Client depuis " + year);
                    
                    return item;
                })
                .collect(Collectors.toList());
        
        Map<String, Object> response = new HashMap<>();
        response.put("content", content);
        
        return ResponseEntity.ok(response);
    }
}