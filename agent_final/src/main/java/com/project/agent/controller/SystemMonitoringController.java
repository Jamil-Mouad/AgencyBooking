package com.project.agent.controller;

import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.project.agent.scheduler.MaintenanceScheduler;
import com.project.agent.scheduler.MaintenanceScheduler.TaskStatistics;

@RestController
@RequestMapping("/api/admin/system")
@PreAuthorize("hasRole('ADMIN')")
public class SystemMonitoringController {
    
    @Autowired
    private MaintenanceScheduler maintenanceScheduler;
    
    /**
     * Récupère les statistiques des tâches planifiées
     */
    @GetMapping("/scheduled-tasks")
    public ResponseEntity<Map<String, TaskStatistics>> getScheduledTasksStatistics() {
        return ResponseEntity.ok(maintenanceScheduler.getTaskStatistics());
    }
}