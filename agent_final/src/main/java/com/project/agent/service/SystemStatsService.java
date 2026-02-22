// Créer un nouveau service: src/main/java/com/project/agent/service/SystemStatsService.java

package com.project.agent.service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.project.agent.model.SecurityAuditLog;
import com.project.agent.model.Reservation;
import com.project.agent.model.Users;
import com.project.agent.repository.AgencyRepository;
import com.project.agent.repository.ReservationRepository;
import com.project.agent.repository.SecurityAuditLogRepository;
import com.project.agent.repository.UserRepository;

@Service
public class SystemStatsService {
    
    @Autowired
    private SecurityAuditLogRepository auditLogRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private AgencyRepository agencyRepository;

    @Autowired
    private ReservationRepository reservationRepository;
    
    /**
     * Récupère les statistiques des sessions utilisateurs
     * @return Map contenant les statistiques des sessions
     */
    public Map<String, Object> getSessionStats() {
        Map<String, Object> stats = new HashMap<>();
        
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime startOfDay = now.toLocalDate().atStartOfDay();
        LocalDateTime startOfWeek = now.toLocalDate().minusDays(now.getDayOfWeek().getValue() - 1).atStartOfDay();
        LocalDateTime startOfMonth = now.toLocalDate().withDayOfMonth(1).atStartOfDay();
        
        // Récupérer les connexions réussies
        List<SecurityAuditLog> todayLogins = auditLogRepository.findByActionAndTimestampBetween("LOGIN_SUCCESS", startOfDay, now);
        List<SecurityAuditLog> weekLogins = auditLogRepository.findByActionAndTimestampBetween("LOGIN_SUCCESS", startOfWeek, now);
        List<SecurityAuditLog> monthLogins = auditLogRepository.findByActionAndTimestampBetween("LOGIN_SUCCESS", startOfMonth, now);
        
        // Récupérer les connexions échouées
        List<SecurityAuditLog> todayFailedLogins = auditLogRepository.findByActionAndTimestampBetween("LOGIN_FAILURE", startOfDay, now);
        
        stats.put("todayLogins", todayLogins.size());
        stats.put("weekLogins", weekLogins.size());
        stats.put("monthLogins", monthLogins.size());
        stats.put("todayFailedLogins", todayFailedLogins.size());
        
        // Calculer le nombre d'utilisateurs uniques qui se sont connectés aujourd'hui
        long uniqueUsers = todayLogins.stream()
                .map(SecurityAuditLog::getUserEmail)
                .distinct()
                .count();
        stats.put("uniqueUsersToday", uniqueUsers);
        
        return stats;
    }
    
    /**
     * Récupère les statistiques générales du système
     * @return Map contenant les statistiques système
     */
    public Map<String, Object> getSystemStats() {
        Map<String, Object> stats = new HashMap<>();
        
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime last24h = now.minusHours(24);
        LocalDateTime lastWeek = now.minusDays(7);
        
        // Compter les utilisateurs par rôle
        long totalUsers = userRepository.count();
        long usersWithRoleUser = userRepository.countByRole(Users.Role.USER);
        long usersWithRoleAgent = userRepository.countByRole(Users.Role.AGENT);
        long usersWithRoleAdmin = userRepository.countByRole(Users.Role.ADMIN);
        
        long totalAgencies = agencyRepository.count();

        // Frontend-expected keys
        stats.put("totalUsers", usersWithRoleUser);
        stats.put("totalAgents", usersWithRoleAgent);
        stats.put("totalAgencies", totalAgencies);

        // Backward-compatible keys
        stats.put("totalAllUsers", totalUsers);
        stats.put("usersWithRoleUser", usersWithRoleUser);
        stats.put("usersWithRoleAgent", usersWithRoleAgent);
        stats.put("usersWithRoleAdmin", usersWithRoleAdmin);
        
        // Statistiques des réservations
        long totalReservations = reservationRepository.count();
        long pendingReservations = reservationRepository.countByStatus(Reservation.Status.PENDING);
        long confirmedReservations = reservationRepository.countByStatus(Reservation.Status.CONFIRMED);
        long completedReservations = reservationRepository.countByStatus(Reservation.Status.COMPLETED);
        long canceledReservations = reservationRepository.countByStatus(Reservation.Status.CANCELED);
        
        stats.put("totalReservations", totalReservations);
        stats.put("pendingReservations", pendingReservations);
        stats.put("confirmedReservations", confirmedReservations);
        stats.put("completedReservations", completedReservations);
        stats.put("canceledReservations", canceledReservations);
        
        // Activité récente
        long reservationsLast24h = reservationRepository.countByCreatedAtBetween(last24h, now);
        long reservationsLastWeek = reservationRepository.countByCreatedAtBetween(lastWeek, now);
        
        stats.put("reservationsLast24h", reservationsLast24h);
        stats.put("reservationsLastWeek", reservationsLastWeek);
        
        return stats;
    }
    
    /**
     * Récupère les données pour le graphique de sessions
     * @return Map contenant les données pour le graphique de sessions (24 dernières heures)
     */
    public Map<String, Object> getSessionGraphData() {
        Map<String, Object> graphData = new HashMap<>();
        
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime past24Hours = now.minusHours(24);
        
        // Récupérer toutes les connexions des dernières 24h
        List<SecurityAuditLog> logins = auditLogRepository.findByActionAndTimestampBetween("LOGIN_SUCCESS", past24Hours, now);
        
        // Créer les données du graphique par heure
        int[] hourlyData = new int[24];
        String[] labels = new String[24];
        
        for (int i = 0; i < 24; i++) {
            LocalDateTime hourStart = now.minusHours(24 - i);
            LocalDateTime hourEnd = now.minusHours(23 - i);
            
            labels[i] = hourStart.getHour() + "h";
            
            int count = 0;
            for (SecurityAuditLog log : logins) {
                if (log.getTimestamp().isAfter(hourStart) && log.getTimestamp().isBefore(hourEnd)) {
                    count++;
                }
            }
            hourlyData[i] = count;
        }
        
        graphData.put("labels", labels);
        graphData.put("data", hourlyData);
        
        return graphData;
    }
}