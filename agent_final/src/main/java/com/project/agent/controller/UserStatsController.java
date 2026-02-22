package com.project.agent.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.project.agent.dto.ApiResponse;
import com.project.agent.dto.UserStatsDTO;
import com.project.agent.service.UserStatsService;

@RestController
@RequestMapping("/api/user/stats")
public class UserStatsController {
    
    private static final Logger logger = LoggerFactory.getLogger(UserStatsController.class);
    
    @Autowired
    private UserStatsService userStatsService;
    
    /**
     * Récupère les statistiques de l'utilisateur courant
     */
    @GetMapping
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<?> getUserStats() {
        try {
            logger.info("Récupération des statistiques utilisateur");
            UserStatsDTO stats = userStatsService.getCurrentUserStats();
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            logger.error("Erreur lors de la récupération des statistiques: {}", e.getMessage());
            return ResponseEntity.badRequest().body(new ApiResponse(e.getMessage(), false));
        }
    }
}