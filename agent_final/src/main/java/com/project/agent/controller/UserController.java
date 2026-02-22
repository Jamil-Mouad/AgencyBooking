package com.project.agent.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import com.project.agent.dto.ApiResponse;
import com.project.agent.dto.DeleteAccountRequest;
import com.project.agent.dto.PasswordChangeRequest;
import com.project.agent.dto.ReservationRequest;
import com.project.agent.dto.UsernameUpdateRequest;
import com.project.agent.model.Reservation;
import com.project.agent.model.Users;
import com.project.agent.repository.UserRepository;
import com.project.agent.service.ReservationService;
import com.project.agent.service.UserService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/user")
public class UserController {
    private static final Logger logger = LoggerFactory.getLogger(UserController.class);

    @Autowired
    private ReservationService reservationService;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private SimpMessagingTemplate messagingTemplate;
    
    @Autowired
    private UserService userService;
    
    @PostMapping("/reservation")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<ApiResponse> createReservation(@Valid @RequestBody ReservationRequest reservationRequest) {
        logger.info("Requête de création de réservation reçue: {}", reservationRequest);
        try {
            Reservation newReservation = reservationService.createReservation(reservationRequest);
            logger.info("Réservation créée avec succès, ID: {}", newReservation.getId());
            
            // Notifier les agents en temps réel
            messagingTemplate.convertAndSend("/topic/reservations", newReservation);
            
            return ResponseEntity.ok(new ApiResponse("Réservation créée avec succès", true));
        } catch (Exception e) {
            logger.error("Erreur lors de la création de la réservation: {}", e.getMessage());
            return ResponseEntity.badRequest().body(new ApiResponse(e.getMessage(), false));
        }
    }
    
    @GetMapping("/reservations")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<List<Reservation>> getUserReservations() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        logger.info("Récupération des réservations pour l'utilisateur: {}", email);
        
        Users user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
        
        List<Reservation> userReservations = reservationService.getReservationsByUser(user);
        logger.info("Nombre de réservations trouvées: {}", userReservations.size());
        
        return ResponseEntity.ok(userReservations);
    }
    
    @PostMapping("/reservation/cancel/{id}")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<ApiResponse> cancelReservation(@PathVariable("id") Long reservationId) {
        logger.info("Requête d'annulation de réservation: {}", reservationId);
        try {
            Reservation canceledReservation = reservationService.cancelReservation(reservationId);
            logger.info("Réservation annulée avec succès: {}", reservationId);
            
            // Notifier en temps réel
            messagingTemplate.convertAndSend("/topic/reservation-updated", canceledReservation);
            
            return ResponseEntity.ok(new ApiResponse("Réservation annulée avec succès", true));
        } catch (Exception e) {
            logger.error("Erreur lors de l'annulation de la réservation: {}", e.getMessage());
            return ResponseEntity.badRequest().body(new ApiResponse(e.getMessage(), false));
        }
    }
    
    @PostMapping("/update-username")
    @PreAuthorize("hasAnyRole('USER', 'AGENT')")
    public ResponseEntity<ApiResponse> updateUsername(@Valid @RequestBody UsernameUpdateRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        
        try {
            logger.info("Tentative de mise à jour du nom d'utilisateur pour {}: {}", email, request.getUsername());
            Users updatedUser = userService.updateUsername(email, request.getUsername());
            
            return ResponseEntity.ok(new ApiResponse("Nom d'utilisateur mis à jour avec succès", true));
        } catch (Exception e) {
            logger.error("Erreur lors de la mise à jour du nom d'utilisateur pour {}: {}", email, e.getMessage());
            return ResponseEntity.badRequest().body(new ApiResponse(e.getMessage(), false));
        }
    }
    
    @PostMapping("/delete-account")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<ApiResponse> deleteAccount(@Valid @RequestBody DeleteAccountRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        logger.info("Demande de suppression de compte pour {}", email);
        
        try {
            userService.deleteUserAccount(email, request.getPassword());
            SecurityContextHolder.clearContext();
            
            logger.info("Compte supprimé avec succès pour {}", email);
            return ResponseEntity.ok(new ApiResponse("Compte supprimé avec succès", true));
        } catch (Exception e) {
            logger.error("Erreur lors de la suppression du compte pour {}: {}", email, e.getMessage());
            return ResponseEntity.badRequest().body(new ApiResponse(e.getMessage(), false));
        }
    }
    
    @PostMapping("/change-password")
    @PreAuthorize("hasAnyRole('USER', 'AGENT')")
    public ResponseEntity<ApiResponse> changePassword(@Valid @RequestBody PasswordChangeRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        
        try {
            logger.info("Tentative de changement de mot de passe pour {}", email);
            userService.changePassword(email, request.getCurrentPassword(), request.getNewPassword());
            return ResponseEntity.ok(new ApiResponse("Mot de passe modifié avec succès", true));
        } catch (Exception e) {
            logger.error("Erreur lors du changement de mot de passe pour {}: {}", email, e.getMessage());
            return ResponseEntity.badRequest().body(new ApiResponse(e.getMessage(), false));
        }
    }
    
    @GetMapping("/has-active-reservation")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<Object> hasActiveReservation() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        logger.info("Vérification des réservations actives pour l'utilisateur: {}", email);
        
        Users user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
        
        boolean hasActiveReservation = reservationService.hasActiveReservation(user);
        logger.info("L'utilisateur a-t-il une réservation active: {}", hasActiveReservation);
        
        Map<String, Object> response = new HashMap<>();
        response.put("hasActiveReservation", hasActiveReservation);
        
        return ResponseEntity.ok(response);
    }
}