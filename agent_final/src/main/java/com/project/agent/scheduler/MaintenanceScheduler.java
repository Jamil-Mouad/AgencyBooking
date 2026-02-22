package com.project.agent.scheduler;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.project.agent.model.ReservationLock;
import com.project.agent.repository.ReservationLockRepository;
import com.project.agent.repository.ReservationRepository;

import org.springframework.transaction.annotation.Transactional;

@Component
public class MaintenanceScheduler {
    
    private static final Logger logger = LoggerFactory.getLogger(MaintenanceScheduler.class);
    
    @Autowired
    private ReservationLockRepository lockRepository;
    
    @Autowired
    private ReservationRepository reservationRepository;
    
    @Autowired
    private SimpMessagingTemplate messagingTemplate;
    
    // Map pour stocker les statistiques des tâches planifiées
    private final Map<String, TaskStatistics> taskStats = new HashMap<>();
    
    /**
     * Nettoyer les verrous de réservation expirés
     * Exécuté toutes les 10 minutes
     */
    @Scheduled(fixedRateString = "${scheduler.expired-locks-cleanup.interval-ms:600000}")
    @ConditionalOnProperty(name = "scheduler.expired-locks-cleanup.enabled", havingValue = "true", matchIfMissing = true)
    @Transactional
    public void cleanupExpiredLocks() {
        String taskName = "cleanupExpiredLocks";
        startTask(taskName);
        
        logger.info("Nettoyage des verrous de réservation expirés");
        
        LocalDateTime now = LocalDateTime.now();
        List<ReservationLock> expiredLocks = lockRepository.findByActiveAndExpiresAtBefore(true, now);
        
        if (!expiredLocks.isEmpty()) {
            logger.info("Suppression de {} verrous expirés", expiredLocks.size());
            
            for (ReservationLock lock : expiredLocks) {
                // Désactiver le verrou
                lock.setActive(false);
                lockRepository.save(lock);
                
                // Notifier de la libération du verrou
                if (lock.getReservation() != null) {
                    messagingTemplate.convertAndSend(
                            "/topic/reservation-lock-status",
                            Map.of(
                                "locked", false, 
                                "reservationId", lock.getReservation().getId(),
                                "message", "Verrou expiré automatiquement"
                            )
                    );
                }
            }
        }
        
        completeTask(taskName, expiredLocks.size());
    }
    
    /**
     * Calculer des métriques d'utilisation du système
     * Exécuté toutes les heures
     */
    @Scheduled(cron = "${scheduler.system-metrics.cron:0 0 * * * *}")
    @ConditionalOnProperty(name = "scheduler.system-metrics.enabled", havingValue = "true", matchIfMissing = true)
    public void calculateSystemMetrics() {
        String taskName = "calculateSystemMetrics";
        startTask(taskName);
        
        logger.info("Calcul des métriques d'utilisation du système");
        
        // Implémentation simplifiée pour l'exemple
        Map<String, Object> metrics = new HashMap<>();
        metrics.put("timestamp", LocalDateTime.now());
        metrics.put("activeUsers", 0); // À implémenter
        metrics.put("activeAgents", 0); // À implémenter
        
        // Publier les métriques
        messagingTemplate.convertAndSend("/topic/system-metrics", metrics);
        
        completeTask(taskName, 1);
    }
    
    /**
     * Récupère les statistiques d'exécution des tâches planifiées
     */
    public Map<String, TaskStatistics> getTaskStatistics() {
        return new HashMap<>(taskStats);
    }
    
    /**
     * Marque le début d'une tâche pour les statistiques
     */
    private void startTask(String taskName) {
        TaskStatistics stats = taskStats.getOrDefault(taskName, new TaskStatistics(taskName));
        stats.startExecution();
        taskStats.put(taskName, stats);
    }
    
    /**
     * Marque la fin d'une tâche pour les statistiques
     */
    private void completeTask(String taskName, int itemsProcessed) {
        TaskStatistics stats = taskStats.get(taskName);
        if (stats != null) {
            stats.completeExecution(itemsProcessed);
        }
    }
    
    /**
     * Classe interne pour stocker les statistiques d'exécution des tâches
     */
    public static class TaskStatistics {
        private final String taskName;
        private LocalDateTime lastStarted;
        private LocalDateTime lastCompleted;
        private long totalExecutions = 0;
        private long totalItemsProcessed = 0;
        private long totalExecutionTimeMs = 0;
        
        public TaskStatistics(String taskName) {
            this.taskName = taskName;
        }
        
        public void startExecution() {
            this.lastStarted = LocalDateTime.now();
        }
        
        public void completeExecution(int itemsProcessed) {
            this.lastCompleted = LocalDateTime.now();
            this.totalExecutions++;
            this.totalItemsProcessed += itemsProcessed;
            
            if (this.lastStarted != null) {
                long executionTimeMs = java.time.Duration.between(this.lastStarted, this.lastCompleted).toMillis();
                this.totalExecutionTimeMs += executionTimeMs;
            }
        }
        
        // Getters
        public String getTaskName() { return taskName; }
        public LocalDateTime getLastStarted() { return lastStarted; }
        public LocalDateTime getLastCompleted() { return lastCompleted; }
        public long getTotalExecutions() { return totalExecutions; }
        public long getTotalItemsProcessed() { return totalItemsProcessed; }
        public long getTotalExecutionTimeMs() { return totalExecutionTimeMs; }
        public long getAverageExecutionTimeMs() { 
            return totalExecutions > 0 ? totalExecutionTimeMs / totalExecutions : 0; 
        }
    }
}