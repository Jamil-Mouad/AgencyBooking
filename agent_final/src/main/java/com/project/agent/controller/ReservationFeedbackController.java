package com.project.agent.controller;

import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.project.agent.dto.ApiResponse;
import com.project.agent.dto.ReservationFeedbackDTO;
import com.project.agent.model.ReservationFeedback;
import com.project.agent.model.Reservation;
import com.project.agent.repository.ReservationRepository;
import com.project.agent.service.EmailService;
import com.project.agent.service.ReservationFeedbackService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/user/feedback")
public class ReservationFeedbackController {
    
    private static final Logger logger = LoggerFactory.getLogger(ReservationFeedbackController.class);
    
    @Autowired
    private ReservationFeedbackService feedbackService;
    
    @Autowired
    private ReservationRepository reservationRepository;
    
    @Autowired
    private EmailService emailService;
    
    /**
     * Ajoute un feedback pour une réservation complétée
     */
    @PostMapping
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<ApiResponse> addFeedback(@Valid @RequestBody ReservationFeedbackDTO feedbackDTO) {
        try {
            logger.info("Ajout d'un feedback pour la réservation {}", feedbackDTO.getReservationId());
            
            ReservationFeedback feedback = feedbackService.createFeedback(
                    feedbackDTO.getReservationId(), 
                    feedbackDTO.getComment(), 
                    feedbackDTO.getRating());
            
            // Récupérer la réservation pour l'email de remerciement
            Optional<Reservation> reservationOpt = reservationRepository.findById(feedbackDTO.getReservationId());
            if (reservationOpt.isPresent()) {
                Reservation reservation = reservationOpt.get();
                // Envoyer un email de remerciement
                emailService.sendFeedbackThankYou(reservation.getUser(), reservation.getService());
            }
            
            return ResponseEntity.ok(new ApiResponse("Merci pour votre avis!", true));
        } catch (Exception e) {
            logger.error("Erreur lors de l'ajout du feedback: {}", e.getMessage());
            return ResponseEntity.badRequest().body(new ApiResponse(e.getMessage(), false));
        }
    }
    
    /**
     * Vérifie si un feedback existe déjà pour une réservation
     */
    @GetMapping("/{reservationId}/exists")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<ApiResponse> checkFeedbackExists(@PathVariable Long reservationId) {
        try {
            Optional<ReservationFeedback> feedback = feedbackService.getFeedbackForReservation(reservationId);
            boolean exists = feedback.isPresent();
            
            return ResponseEntity.ok(new ApiResponse(
                    exists ? "Un avis existe déjà pour cette réservation" : "Aucun avis existant", 
                    exists));
        } catch (Exception e) {
            logger.error("Erreur lors de la vérification du feedback: {}", e.getMessage());
            return ResponseEntity.badRequest().body(new ApiResponse(e.getMessage(), false));
        }
    }
    
    /**
     * Récupère le feedback pour une réservation spécifique
     */
    @GetMapping("/{reservationId}")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<?> getFeedback(@PathVariable Long reservationId) {
        try {
            Optional<ReservationFeedback> feedback = feedbackService.getFeedbackForReservation(reservationId);
            
            if (feedback.isPresent()) {
                return ResponseEntity.ok(feedback.get());
            } else {
                return ResponseEntity.ok(new ApiResponse("Aucun avis trouvé pour cette réservation", false));
            }
        } catch (Exception e) {
            logger.error("Erreur lors de la récupération du feedback: {}", e.getMessage());
            return ResponseEntity.badRequest().body(new ApiResponse(e.getMessage(), false));
        }
    }
    
    /**
     * Récupère tous les feedbacks de l'utilisateur courant
     */
    @GetMapping
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<?> getUserFeedbacks() {
        try {
            return ResponseEntity.ok(feedbackService.getUserFeedbacks());
        } catch (Exception e) {
            logger.error("Erreur lors de la récupération des feedbacks: {}", e.getMessage());
            return ResponseEntity.badRequest().body(new ApiResponse(e.getMessage(), false));
        }
    }
}