// src/main/java/com/project/agent/controller/SystemStatsController.java

package com.project.agent.controller;

import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.project.agent.service.SystemStatsService;

@RestController
@RequestMapping("/api/admin/system-stats")
@PreAuthorize("hasRole('ADMIN')")
public class SystemStatsController {
    
    @Autowired
    private SystemStatsService systemStatsService;
    
    /**
     * Récupère les statistiques des sessions utilisateurs
     */
    @GetMapping("/sessions")
    public ResponseEntity<Map<String, Object>> getSessionStats() {
        return ResponseEntity.ok(systemStatsService.getSessionStats());
    }
    
    /**
     * Récupère les statistiques générales du système
     */
    @GetMapping("/general")
    public ResponseEntity<Map<String, Object>> getSystemStats() {
        return ResponseEntity.ok(systemStatsService.getSystemStats());
    }
    
    /**
     * Récupère les données pour le graphique de sessions
     */
    @GetMapping("/session-graph")
    public ResponseEntity<Map<String, Object>> getSessionGraphData() {
        return ResponseEntity.ok(systemStatsService.getSessionGraphData());
    }
}