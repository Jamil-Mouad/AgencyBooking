package com.project.agent.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import com.project.agent.dto.UserStatsDTO;
import com.project.agent.model.Agency;
import com.project.agent.model.Reservation;
import com.project.agent.model.Reservation.Status;
import com.project.agent.model.Users;
import com.project.agent.repository.ReservationRepository;
import com.project.agent.repository.UserRepository;

@Service
public class UserStatsService {

    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private ReservationRepository reservationRepository;
    
    /**
     * Récupère les statistiques pour l'utilisateur actuel
     */
    public UserStatsDTO getCurrentUserStats() {
        // Obtenir l'utilisateur actuel
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        
        Users user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
        
        return getUserStats(user);
    }
    
    /**
     * Récupère les statistiques pour un utilisateur spécifique
     */
    public UserStatsDTO getUserStats(Users user) {
        UserStatsDTO stats = new UserStatsDTO();
        
        // Nombre total de réservations
        long totalReservations = reservationRepository.countByUser(user);
        stats.setTotalReservations(totalReservations);
        
        // Réservations par statut
        stats.setPendingReservations(reservationRepository.countByUserAndStatus(user, Status.PENDING));
        stats.setCompletedReservations(reservationRepository.countByUserAndStatus(user, Status.COMPLETED));
        stats.setCanceledReservations(reservationRepository.countByUserAndStatus(user, Status.CANCELED));
        
        // Agences visitées (seulement pour les réservations complétées)
        List<Agency> agencies = reservationRepository.findDistinctAgenciesByUserAndStatusCompleted(user);
        List<String> agencyNames = agencies.stream()
                .map(Agency::getName)
                .collect(Collectors.toList());
        
        stats.setAgenciesVisited(agencyNames);
        
        return stats;
    }
}