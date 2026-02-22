package com.project.agent.controller;

import java.util.HashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.project.agent.dto.ApiResponse;
import com.project.agent.dto.PasswordChangeRequest;
import com.project.agent.dto.UsernameUpdateRequest;
import com.project.agent.model.Users;
import com.project.agent.repository.UserRepository;
import com.project.agent.service.UserService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/admin/profile")
@PreAuthorize("hasRole('ADMIN')")
public class AdminProfileController {
    private static final Logger logger = LoggerFactory.getLogger(AdminProfileController.class);
    
    @Autowired
    private UserService userService;
    
    @Autowired
    private UserRepository userRepository;
    
    /**
     * Récupère les informations du profil de l'administrateur connecté
     */
    @GetMapping
    public ResponseEntity<?> getAdminProfile() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        
        Users user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
        
        Map<String, Object> profile = new HashMap<>();
        profile.put("id", user.getId());
        profile.put("username", user.getUsername());
        profile.put("email", user.getEmail());
        profile.put("role", user.getRole());
        
        return ResponseEntity.ok(profile);
    }
    
    /**
     * Met à jour le nom d'utilisateur de l'administrateur connecté
     */
    @PostMapping("/update-username")
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
    
    /**
     * Change le mot de passe de l'administrateur connecté
     */
    @PostMapping("/change-password")
    public ResponseEntity<ApiResponse> changePassword(@Valid @RequestBody PasswordChangeRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        
        try {
            userService.changePassword(email, request.getCurrentPassword(), request.getNewPassword());
            return ResponseEntity.ok(new ApiResponse("Mot de passe modifié avec succès", true));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ApiResponse(e.getMessage(), false));
        }
    }
}